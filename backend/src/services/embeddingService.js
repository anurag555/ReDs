import { pipeline } from '@xenova/transformers';

/**
 * High-performance, local embedding generator using Transformers.js (ONNX).
 * Default model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
 * Generates vector embeddings directly in Node.js without needing external API keys.
 */
class EmbeddingService {
  constructor() {
    this.modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    this.extractor = null;
    this.initPromise = null;
  }

  async init() {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log(`[EmbeddingService] Initializing embedding model: ${this.modelName}...`);
        this.extractor = await pipeline('feature-extraction', this.modelName);
        console.log(`[EmbeddingService] Model loaded successfully.`);
      })();
    }
    await this.initPromise;
  }

  /**
   * Generates a normalized 384-dimension embedding array for text.
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async getEmbedding(text) {
    if (!this.extractor) {
      await this.init();
    }

    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data);
  }

  /**
   * Batch generation of embeddings for an array of texts.
   * @param {string[]} texts
   * @returns {Promise<number[][]>}
   */
  async getBatchEmbeddings(texts) {
    if (!this.extractor) {
      await this.init();
    }

    const embeddings = [];
    for (const text of texts) {
      const emb = await this.getEmbedding(text);
      embeddings.push(emb);
    }
    return embeddings;
  }
}

export const embeddingService = new EmbeddingService();

