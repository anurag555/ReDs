import { groqService } from './groqService.js';

class QueryUnderstandingService {
  constructor() {
    // In-memory cache: maps lowercase normalized raw query -> cached result
    this.cache = new Map();
    this.maxCacheSize = 500;
  }

  /**
   * Normalizes, expands, and detects DSA concepts from a raw user query using Groq.
   * If Groq fails or times out, safely falls back to the original query without crashing.
   *
   * @param {string} rawQuery
   * @returns {Promise<{
   *   originalQuery: string,
   *   normalizedQuery: string,
   *   detectedConcept: string|null,
   *   expandedTerms: string[],
   *   confidence: string,
   *   cached: boolean,
   *   tokens: { promptTokens: number, completionTokens: number, totalTokens: number }|null,
   *   fallback: boolean,
   *   latencyMs: number
   * }>}
   */
  async understandQuery(rawQuery) {
    const trimmed = (rawQuery || '').trim();
    if (!trimmed) {
      return this._createFallbackResult(trimmed, 'Empty query');
    }

    const cacheKey = trimmed.toLowerCase();
    const startTime = Date.now();

    // Check in-memory cache first to avoid duplicate Groq calls & reduce latency/token cost
    if (this.cache.has(cacheKey)) {
      const cachedEntry = this.cache.get(cacheKey);
      return {
        ...cachedEntry,
        cached: true,
        latencyMs: Date.now() - startTime,
      };
    }

    const client = groqService.getClient();
    if (!client) {
      console.warn('[QueryUnderstanding] No Groq client available, returning fallback.');
      return this._createFallbackResult(trimmed, 'Groq API key not configured');
    }

    const systemPrompt = `You are a DSA search query normalizer for Striver's A2Z DSA lecture series.
Your task is to transform poorly phrased, abbreviated, or misspelled queries into precise semantic queries optimized for vector embeddings.

Rules:
1. Fix typos (e.g. "kadne" -> "Kadane", "recusion" -> "recursion", "rotatd" -> "rotated").
2. Expand abbreviations & shorthand:
   - "topo sort" -> "Topological sort in Directed Acyclic Graph (DAG) Kahn's algorithm"
   - "ll" -> "linked list"
   - "two ptr" / "2 ptr" -> "two pointer technique"
   - "bs" -> "binary search"
   - "dp" -> "dynamic programming"
   - "pq" -> "priority queue min max heap"
   - "subarr" -> "subarray"
   - "subseq" -> "subsequence"
   - "mst" -> "minimum spanning tree Kruskal Prim"
   - "lca" -> "lowest common ancestor"
   - "dsu" -> "disjoint set union"
   - "tortoise" -> "Floyd's cycle detection tortoise and hare algorithm"
3. Identify the core DSA concept/topic (e.g., "Graph Algorithms / Topological Sort", "Linked List / Cycle Detection").
4. Provide 2-4 alternative keywords/expanded terms.
5. Provide a single rich 'normalizedQuery' combining the canonical problem name and primary technical keywords.

Respond in STRICT JSON with this schema:
{
  "normalizedQuery": "Expanded, clean, technical DSA search query",
  "detectedConcept": "Category / Concept Name",
  "expandedTerms": ["term1", "term2", "term3"],
  "confidence": "high" | "medium" | "low"
}`;

    const userPrompt = `Raw user query: "${trimmed}"`;

    const preferredModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const modelsToTry = [
      preferredModel,
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of modelsToTry) {
      try {
        // Enforce 4500ms timeout to ensure fast search response
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Groq query understanding timeout (4500ms)')), 4500)
        );

        const apiPromise = client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const chatCompletion = await Promise.race([apiPromise, timeoutPromise]);
        const rawJson = chatCompletion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawJson);

        const normalizedQuery = (parsed.normalizedQuery || '').trim() || trimmed;
        const detectedConcept = parsed.detectedConcept || null;
        const expandedTerms = Array.isArray(parsed.expandedTerms) ? parsed.expandedTerms : [];
        const confidence = parsed.confidence || 'medium';

        const tokenUsage = chatCompletion.usage
          ? {
              promptTokens: chatCompletion.usage.prompt_tokens || 0,
              completionTokens: chatCompletion.usage.completion_tokens || 0,
              totalTokens: chatCompletion.usage.total_tokens || 0,
            }
          : null;

        const result = {
          originalQuery: trimmed,
          normalizedQuery,
          detectedConcept,
          expandedTerms,
          confidence,
          cached: false,
          tokens: tokenUsage,
          fallback: false,
          modelUsed: model,
          latencyMs: Date.now() - startTime,
        };

        // Store in cache (with LRU eviction if oversized)
        this._setCache(cacheKey, result);

        return result;
      } catch (err) {
        console.warn(`[QueryUnderstanding] Model ${model} failed (${err.message}). Trying fallback...`);
      }
    }

    // All models failed or timed out: safely return fallback
    console.warn(`[QueryUnderstanding] Normalization failed for "${trimmed}". Safely falling back to raw query.`);
    return this._createFallbackResult(trimmed, 'All Groq normalization attempts failed');
  }

  _createFallbackResult(query, reason) {
    return {
      originalQuery: query,
      normalizedQuery: query,
      detectedConcept: null,
      expandedTerms: [],
      confidence: 'low',
      cached: false,
      tokens: null,
      fallback: true,
      reason,
      latencyMs: 0,
    };
  }

  _setCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }
}

export const queryUnderstandingService = new QueryUnderstandingService();

