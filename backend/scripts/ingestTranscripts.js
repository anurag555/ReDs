import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from '../src/services/embeddingService.js';
import { qdrantService } from '../src/services/qdrantService.js';
import { formatSeconds } from '../src/utils/timeUtils.js';

// Load environment variables from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TRANSCRIPTS_DIR = path.resolve(__dirname, '../../../data/algo_recall_transcripts');

/**
 * Creates overlapping time-windowed chunks from raw subtitle segments.
 */
function createChunksFromTranscript(videoData, windowSeconds = 90, overlapSeconds = 20) {
  const segments = videoData.segments || [];
  if (segments.length === 0) return [];

  const chunks = [];
  let startIdx = 0;

  while (startIdx < segments.length) {
    const chunkStart = segments[startIdx].start;
    let currIdx = startIdx;
    let textParts = [];
    let chunkEnd = chunkStart;

    while (currIdx < segments.length && (segments[currIdx].start - chunkStart) < windowSeconds) {
      const seg = segments[currIdx];
      textParts.push(seg.text);
      chunkEnd = seg.end;
      currIdx++;
    }

    const chunkText = textParts.join(' ').trim();
    const startSec = Math.floor(chunkStart);
    const endSec = Math.floor(chunkEnd);

    if (chunkText.length > 20) {
      chunks.push({
        id: uuidv4(),
        video_id: videoData.video_id,
        video_title: videoData.title || 'Striver DSA Lecture',
        start_seconds: startSec,
        end_seconds: endSec,
        start_timestamp: formatSeconds(startSec),
        end_timestamp: formatSeconds(endSec),
        timestamp_url: `https://youtu.be/${videoData.video_id}?t=${startSec}`,
        text: chunkText,
      });
    }

    // Advance start index to create overlap
    const nextStartTarget = chunkStart + (windowSeconds - overlapSeconds);
    let nextIdx = startIdx + 1;
    while (nextIdx < segments.length && segments[nextIdx].start < nextStartTarget) {
      nextIdx++;
    }
    startIdx = nextIdx > startIdx ? nextIdx : startIdx + 1;
  }

  return chunks;
}

async function runIngestion() {
  console.log('='.repeat(65));
  console.log('  ReDs - Ingesting Striver DSA Transcripts into Qdrant Vector DB');
  console.log('='.repeat(65));

  if (!fs.existsSync(TRANSCRIPTS_DIR)) {
    console.error(`[Error] Transcripts directory not found at: ${TRANSCRIPTS_DIR}`);
    process.exit(1);
  }

  // 1. Initialize Qdrant collection
  const connected = await qdrantService.ensureCollection();
  if (!connected) {
    console.error('[Error] Could not connect to Qdrant. Verify QDRANT_URL and QDRANT_API_KEY in .env');
    process.exit(1);
  }

  // 2. Discover existing video IDs already indexed in Qdrant (Resumability)
  const client = qdrantService.getClient();
  const existingVideoIds = new Set();
  try {
    let nextOffset = null;
    do {
      const scrollRes = await client.scroll(qdrantService.collectionName, {
        limit: 1000,
        offset: nextOffset || undefined,
        with_payload: ['video_id'],
      });
      for (const p of scrollRes.points || []) {
        if (p.payload?.video_id) existingVideoIds.add(p.payload.video_id);
      }
      nextOffset = scrollRes.next_page_offset;
    } while (nextOffset);
    console.log(`[Qdrant] Found ${existingVideoIds.size} videos already indexed in collection.`);
  } catch (err) {
    console.warn('[Qdrant] Note querying existing IDs:', err.message);
  }

  // 3. Initialize local embedding model
  await embeddingService.init();

  // 4. Read all transcript files
  const files = fs.readdirSync(TRANSCRIPTS_DIR).filter((f) => f.endsWith('.json') && f !== 'manifest.json');
  console.log(`[+] Discovered ${files.length} transcript files to process.\n`);

  let totalChunksIngested = 0;
  let batchPoints = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const vid = file.replace('.json', '');

    if (existingVideoIds.has(vid)) {
      console.log(`[${i + 1}/${files.length}] [CACHED] "${vid}" already in Qdrant.`);
      continue;
    }

    const filePath = path.join(TRANSCRIPTS_DIR, file);
    try {
      const videoData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const chunks = createChunksFromTranscript(videoData);

      console.log(`[${i + 1}/${files.length}] Ingesting "${videoData.title.slice(0, 45)}" (${chunks.length} chunks)...`);

      for (const chunk of chunks) {
        const vector = await embeddingService.getEmbedding(`${chunk.video_title}. ${chunk.text}`);
        batchPoints.push({
          id: chunk.id,
          vector,
          payload: chunk,
        });

        if (batchPoints.length >= BATCH_SIZE) {
          await qdrantService.upsertPoints(batchPoints);
          totalChunksIngested += batchPoints.length;
          batchPoints = [];
          process.stdout.write(`    -> Upserted ${totalChunksIngested} new points into Qdrant...\n`);
        }
      }
    } catch (err) {
      console.warn(`[Warning] Skipping ${file}: ${err.message}`);
    }
  }

  // Flush remaining points
  if (batchPoints.length > 0) {
    await qdrantService.upsertPoints(batchPoints);
    totalChunksIngested += batchPoints.length;
  }

  console.log('\n' + '='.repeat(65));
  console.log('INGESTION COMPLETE!');
  console.log(`Total Transcripts Processed: ${files.length}`);
  console.log(`Newly Uploaded Points: ${totalChunksIngested}`);
  console.log('='.repeat(65));
}

runIngestion().catch((err) => {
  console.error('Fatal ingestion error:', err);
  process.exit(1);
});
