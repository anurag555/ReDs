import { QdrantClient } from '@qdrant/js-client-rest';

class QdrantService {
  constructor() {
    this.client = null;
    this.lastUrl = null;
    this.lastApiKey = null;
    this.collectionName = 'reds_striver_dsa';
    this.vectorSize = 384;
  }

  getClient() {
    const url = process.env.QDRANT_URL || 'http://localhost:6333';
    const apiKey = process.env.QDRANT_API_KEY || undefined;
    this.collectionName = process.env.QDRANT_COLLECTION || 'reds_striver_dsa';
    this.vectorSize = 384;

    if (!this.client || this.lastUrl !== url || this.lastApiKey !== apiKey) {
      this.lastUrl = url;
      this.lastApiKey = apiKey;
      this.client = new QdrantClient({
        url,
        apiKey: apiKey && apiKey.trim().length > 0 ? apiKey : undefined,
        checkCompatibility: false,
      });
    }
    return this.client;
  }

  /**
   * Checks if the collection exists, creates it if missing.
   */
  async ensureCollection() {
    try {
      const client = this.getClient();
      const collections = await client.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        console.log(`[QdrantService] Creating collection '${this.collectionName}' on cluster...`);
        await client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
        console.log(`[QdrantService] Collection '${this.collectionName}' created successfully.`);
      } else {
        console.log(`[QdrantService] Connected to Qdrant cluster. Collection '${this.collectionName}' is ready.`);
      }
      return true;
    } catch (err) {
      console.warn(`[QdrantService] Warning connecting to Qdrant at ${this.lastUrl}:`, err.message);
      return false;
    }
  }

  /**
   * Upsert points into Qdrant collection.
   * @param {Array<{ id: string|number, vector: number[], payload: object }>} points
   */
  async upsertPoints(points) {
    await this.ensureCollection();
    const client = this.getClient();
    return await client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  /**
   * Search for closest vectors in Qdrant.
   * Uses client.query() in @qdrant/js-client-rest v1.13+ or fallback to client.search()
   * @param {number[]} vector
   * @param {number} limit
   * @returns {Promise<Array<{ id: string, score: number, payload: object }>>}
   */
  async search(vector, limit = 5) {
    try {
      const client = this.getClient();
      if (typeof client.query === 'function') {
        const response = await client.query(this.collectionName, {
          query: vector,
          limit,
          with_payload: true,
        });
        return response.points || [];
      } else if (typeof client.search === 'function') {
        return await client.search(this.collectionName, {
          vector,
          limit,
          with_payload: true,
        });
      }
      return [];
    } catch (err) {
      console.error('[QdrantService] Search error:', err.message);
      throw err;
    }
  }

  /**
   * Get collection info / stats.
   */
  async getStats() {
    try {
      const client = this.getClient();
      return await client.getCollection(this.collectionName);
    } catch (err) {
      return { error: err.message, status: 'unavailable' };
    }
  }
}

export const qdrantService = new QdrantService();
