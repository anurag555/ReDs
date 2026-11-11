import Groq from 'groq-sdk';
import { formatSeconds } from '../utils/timeUtils.js';

class GroqService {
  constructor() {
    this.apiKey = null;
    this.client = null;
    this.preferredModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    this.fallbackModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
  }

  getClient() {
    const key = (process.env.GROQ_API_KEY || '').trim();
    if (!this.client || this.apiKey !== key) {
      this.apiKey = key;
      this.client = key ? new Groq({ apiKey: key }) : null;
    }
    return this.client;
  }

  /**
   * Evaluates retrieved chunks, generates a clean explanation,
   * and identifies the top 3 most relevant video timestamps.
   */
  async synthesizeAndSelectTimestamps(query, retrievedChunks) {
    if (!retrievedChunks || retrievedChunks.length === 0) {
      return {
        summary: "No relevant lecture moments found for this query.",
        primaryVideoId: null,
        primaryVideoTitle: null,
        timestamps: [],
      };
    }

    const client = this.getClient();

    // Determine the primary video from the highest-scoring chunk
    const topChunk = retrievedChunks[0].payload;
    const primaryVideoId = topChunk.video_id;
    const primaryVideoTitle = topChunk.video_title;

    // Filter chunks belonging to the primary video or top matching videos
    const sameVideoChunks = retrievedChunks
      .filter((c) => c.payload.video_id === primaryVideoId)
      .slice(0, 5);

    // Fallback if GROQ_API_KEY is not configured
    if (!client) {
      return this._generateFallbackResponse(query, topChunk, sameVideoChunks, retrievedChunks);
    }

    const contextText = sameVideoChunks
      .map(
        (c, idx) =>
          `[Chunk ${idx + 1}] Start: ${c.payload.start_seconds}s (${c.payload.start_timestamp}), Text: "${c.payload.text}"`
      )
      .join('\n\n');

    const systemPrompt = `You are an expert AI teaching assistant for Striver's A2Z DSA lectures.
The user is searching for a DSA topic or problem. You are provided with retrieved lecture transcript segments from the most relevant video: "${primaryVideoTitle}".

Analyze the segments and respond in STRICT JSON format with this exact structure:
{
  "summary": "Crisp 2-3 sentence overview of how Striver explains or approaches this concept in the lecture.",
  "timestamps": [
    {
      "seconds": <integer_start_seconds>,
      "label": "<MM:SS or HH:MM:SS>",
      "description": "<Brief 3-6 word label of what happens at this exact timestamp, e.g. Intuition & Problem Breakdown, Brute Force Analysis, Optimal Two Pointer Code>"
    }
  ]
}

CRITICAL RULES:
1. Provide EXACTLY 3 timestamps.
2. The timestamps must represent 3 distinct progression points in the lecture (e.g., Problem introduction/intuition, Approach breakdown, Optimal solution/code).
3. Base the timestamp 'seconds' strictly on the provided chunks.
4. Output raw JSON only. Do not wrap in markdown quotes or extra commentary.`;

    const userPrompt = `User Query: "${query}"\n\nVideo: "${primaryVideoTitle}" (ID: ${primaryVideoId})\n\nTranscript Segments:\n${contextText}`;

    // Try preferred model, then fallback models
    const modelsToTry = [
      process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of modelsToTry) {
      try {
        const chatCompletion = await client.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });

        const rawJson = chatCompletion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawJson);

        let timestamps = parsed.timestamps || [];

        timestamps = timestamps.map((ts) => ({
          seconds: Number(ts.seconds) || 0,
          label: ts.label || formatSeconds(ts.seconds),
          description: ts.description || 'Key Lecture Concept',
        }));

        if (timestamps.length < 3) {
          timestamps = this._fillTimestamps(timestamps, sameVideoChunks);
        }

        return {
          summary: parsed.summary || `Striver explains ${query} with intuition, edge cases, and optimal code walkthrough.`,
          primaryVideoId,
          primaryVideoTitle,
          timestamps: timestamps.slice(0, 3),
          meta: { modelUsed: model },
        };
      } catch (err) {
        console.warn(`[GroqService] Model ${model} failed (${err.message}). Trying fallback...`);
      }
    }

    // If all models fail, return heuristic fallback
    return this._generateFallbackResponse(query, topChunk, sameVideoChunks, retrievedChunks);
  }

  _generateFallbackResponse(query, topChunk, sameVideoChunks, allChunks) {
    const primaryVideoId = topChunk.video_id;
    const primaryVideoTitle = topChunk.video_title;

    const timestamps = [];
    const usedSeconds = new Set();

    for (const c of sameVideoChunks) {
      const s = c.payload.start_seconds;
      if (!usedSeconds.has(s)) {
        usedSeconds.add(s);
        timestamps.push({
          seconds: s,
          label: c.payload.start_timestamp || formatSeconds(s),
          description: this._inferLabel(timestamps.length),
        });
      }
      if (timestamps.length >= 3) break;
    }

    while (timestamps.length < 3) {
      const fallbackSec = (timestamps.length + 1) * 60;
      timestamps.push({
        seconds: fallbackSec,
        label: formatSeconds(fallbackSec),
        description: this._inferLabel(timestamps.length),
      });
    }

    return {
      summary: `Striver explains "${query}" in this lecture. Watch the video at the selected timestamps to see the full problem breakdown and optimal solution.`,
      primaryVideoId,
      primaryVideoTitle,
      timestamps: timestamps.slice(0, 3),
      note: !this.apiKey ? 'Configure GROQ_API_KEY in backend/.env for AI reasoning.' : undefined,
    };
  }

  _inferLabel(index) {
    if (index === 0) return 'Problem Understanding & Intuition';
    if (index === 1) return 'Approach & Algorithm Logic';
    return 'Optimal Solution & Dry Run';
  }

  _fillTimestamps(existing, chunks) {
    const list = [...existing];
    for (const c of chunks) {
      if (list.length >= 3) break;
      const s = c.payload.start_seconds;
      if (!list.some((item) => Math.abs(item.seconds - s) < 30)) {
        list.push({
          seconds: s,
          label: c.payload.start_timestamp || formatSeconds(s),
          description: this._inferLabel(list.length),
        });
      }
    }
    return list;
  }
}

export const groqService = new GroqService();
