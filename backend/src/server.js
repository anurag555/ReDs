import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import searchRoutes from './routes/search.js';
import { qdrantService } from './services/qdrantService.js';
import { embeddingService } from './services/embeddingService.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', searchRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const qdrantStats = await qdrantService.getStats();
  res.json({
    status: 'online',
    service: 'ReDs Backend',
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
    qdrantStatus: qdrantStats.status || 'connected',
    embeddingModel: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
  });
});

// Root ping
app.get('/', (req, res) => {
  res.send('ReDs - Striver DSA Video RAG Search Backend is running.');
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n=================================================`);
  console.log(`  ReDs Backend listening on http://localhost:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=================================================\n`);

  // Eagerly preheat embedding pipeline
  embeddingService.init().catch((err) => {
    console.warn('[Server] Note on embedding model preheat:', err.message);
  });
});

