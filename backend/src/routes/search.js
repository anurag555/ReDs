import express from 'express';
import { embeddingService } from '../services/embeddingService.js';
import { qdrantService } from '../services/qdrantService.js';
import { groqService } from '../services/groqService.js';
import { queryUnderstandingService } from '../services/queryUnderstandingService.js';

const router = express.Router();

// ─── Query Validation ────────────────────────────────────────────────────────

/**
 * SCORE_THRESHOLD: Minimum cosine similarity (0–1) a Qdrant result must reach
 * to be considered a genuine match. For all-MiniLM-L6-v2 on DSA content:
 *   - Genuine DSA queries score 0.40–0.90
 *   - Gibberish / off-topic queries score 0.10–0.31
 */
const SCORE_THRESHOLD = 0.32;

/**
 * Heuristic regex pre-filter: rejects obvious gibberish before wasting
 * embedding compute or Qdrant bandwidth.
 *
 * Rules:
 *  - Query must contain at least one letter
 *  - Long tokens (>6 chars) with no vowels are a strong gibberish signal
 *  - If every token has no vowel AND no short acronym (≤4 chars), reject
 *
 * Valid DSA shorthand intentionally allowed:
 *   "bst", "dp", "ll", "dsu", "mst", "two ptr", "binry srch" (has vowels)
 */
function isLikelyMeaningful(query) {
  const VOWELS = /[aeiouAEIOU]/;

  if (!/[a-zA-Z]/.test(query)) return false;

  const tokens = query.trim().split(/\s+/);

  const longNoVowelTokens = tokens.filter((t) => t.length > 6 && !VOWELS.test(t));
  if (longNoVowelTokens.length > 0 && longNoVowelTokens.length === tokens.length) {
    return false;
  }

  const allNoVowels = tokens.every((t) => !VOWELS.test(t));
  const allLong     = tokens.every((t) => t.length > 4);
  if (allNoVowels && allLong) return false;

  const hasAnyVowelToken = tokens.some((t) => VOWELS.test(t));
  const hasShortToken    = tokens.some((t) => t.length <= 4);
  if (!hasAnyVowelToken && !hasShortToken) return false;

  return true;
}

/** Canonical "no match" response payload */
function noMatchResponse(trimmedQuery, reason, understandingResult, isEnhanced) {
  const messages = {
    gibberish:           `"${trimmedQuery}" doesn't look like a DSA topic. Try something like "Binary Search" or "Kadane's Algorithm".`,
    low_relevance_score: `No relevant lecture matched "${trimmedQuery}". The query may be too vague or unrelated to DSA.`,
    no_results:          `No results found for "${trimmedQuery}". Try a different search term.`,
  };
  return {
    success: true,
    noMatch: true,
    noMatchReason: reason,
    query: trimmedQuery,
    queryUnderstanding: buildQUPayload(isEnhanced, understandingResult),
    videoId: null,
    videoTitle: null,
    summary: messages[reason] || `No matching Striver DSA lecture found for "${trimmedQuery}".`,
    timestamps: [],
    relevantSegments: [],
  };
}

function buildQUPayload(isEnhanced, r) {
  return {
    active:          isEnhanced,
    normalizedQuery: isEnhanced && r ? r.normalizedQuery  : null,
    detectedConcept: isEnhanced && r ? r.detectedConcept  : null,
    expandedTerms:   isEnhanced && r ? r.expandedTerms    : [],
    cached:          isEnhanced && r ? r.cached            : false,
    tokens:          isEnhanced && r ? r.tokens            : null,
    fallback:        isEnhanced && r ? r.fallback          : false,
  };
}

// ─── POST /api/search ─────────────────────────────────────────────────────────

/**
 * Core RAG search endpoint.
 * Body: { query: string, queryUnderstanding?: boolean = false }
 *
 * queryUnderstanding = false → direct embedding, zero Groq overhead
 * queryUnderstanding = true  → Groq normalises DSA abbreviations/typos first
 */
router.post('/search', async (req, res) => {
  try {
    const { query, queryUnderstanding = false } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const trimmedQuery = query.trim();
    const isEnhanced   = Boolean(queryUnderstanding);

    console.log(`[Search] Mode: ${isEnhanced ? 'ENHANCED' : 'STANDARD'} | Query: "${trimmedQuery}"`);

    // Guard 1 — Regex heuristic (no compute cost)
    if (!isLikelyMeaningful(trimmedQuery)) {
      console.log(`[Search] Rejected (gibberish): "${trimmedQuery}"`);
      return res.json(noMatchResponse(trimmedQuery, 'gibberish', null, isEnhanced));
    }

    // Optional AI Query Understanding layer
    let retrievalQuery     = trimmedQuery;
    let understandingResult = null;

    if (isEnhanced) {
      try {
        understandingResult = await queryUnderstandingService.understandQuery(trimmedQuery);
        if (understandingResult?.normalizedQuery) {
          retrievalQuery = understandingResult.normalizedQuery;
          console.log(`[Search:QU] "${trimmedQuery}" → "${retrievalQuery}" [Concept: ${understandingResult.detectedConcept || 'General'}] [Cached: ${understandingResult.cached}]`);
        }
      } catch (normErr) {
        console.warn('[Search:QU] Normalisation failed, using raw query:', normErr.message);
      }
    }

    // Step 1 — Dense vector embedding
    const queryVector = await embeddingService.getEmbedding(retrievalQuery);

    // Step 2 — Qdrant vector search
    let retrievedChunks = [];
    let qdrantActive    = false;

    try {
      const qdrantResults = await qdrantService.search(queryVector, 8);
      if (qdrantResults?.length > 0) {
        retrievedChunks = qdrantResults;
        qdrantActive    = true;
      }
    } catch (qdrantErr) {
      console.error('[Search] Qdrant search failed:', qdrantErr.message);
    }

    // Guard 2 — Score threshold (post-retrieval)
    if (qdrantActive && retrievedChunks.length > 0) {
      const topScore = retrievedChunks[0].score ?? 1;
      if (topScore < SCORE_THRESHOLD) {
        console.log(`[Search] Rejected (low score ${topScore.toFixed(3)} < ${SCORE_THRESHOLD}): "${trimmedQuery}"`);
        return res.json(noMatchResponse(trimmedQuery, 'low_relevance_score', understandingResult, isEnhanced));
      }
      retrievedChunks = retrievedChunks.filter((c) => (c.score ?? 1) >= SCORE_THRESHOLD);
    }

    if (retrievedChunks.length === 0) {
      return res.json(noMatchResponse(trimmedQuery, 'no_results', understandingResult, isEnhanced));
    }

    // Step 3 — Groq LLM synthesis & 3-timestamp selection
    const result = await groqService.synthesizeAndSelectTimestamps(retrievalQuery, retrievedChunks);

    return res.json({
      success: true,
      query:   trimmedQuery,
      queryUnderstanding: buildQUPayload(isEnhanced, understandingResult),
      videoId:    result.primaryVideoId,
      videoTitle: result.primaryVideoTitle,
      summary:    result.summary,
      timestamps: result.timestamps,
      relevantSegments: retrievedChunks.slice(0, 3).map((c) => ({
        text:         c.payload.text,
        startSeconds: c.payload.start_seconds,
        startLabel:   c.payload.start_timestamp,
        url:          c.payload.timestamp_url,
      })),
      meta: {
        vectorEngine: qdrantActive ? 'Qdrant Vector DB' : 'Unavailable',
        searchMode:   isEnhanced ? 'Enhanced Search (AI Query Understanding)' : 'Standard Search',
      },
    });
  } catch (err) {
    console.error('[Search] Fatal error:', err);
    return res.status(500).json({ error: 'Search failed.', details: err.message });
  }
});

export default router;
