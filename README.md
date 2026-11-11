# ReDs — Semantic Video RAG for YouTube Playlists & Lectures

ReDs is a minimal, local-first Video RAG (Retrieval-Augmented Generation) search tool designed for technical lecture series and long-form YouTube playlists.

Instead of scrubbing through dozens of multi-hour videos to find where a specific concept was discussed, ReDs searches across timestamped transcripts, performs semantic vector retrieval, and uses an LLM to pinpoint **3 progression timestamps** (Concept Intuition, Algorithm/Approach, and Code Walkthrough) so you can jump right to the relevant moment in an embedded player.

---

## ⚡ How It Works

```
User Query ──► [Optional AI Query Normalizer] ──► [Local ONNX Embedding]
                                                          │ (384-dim vector)
                                                          ▼
                                                  [Qdrant Vector DB]
                                                          │ (Cosine search)
                                                          ▼
Nonsense / Off-Topic? ◄── [Score & Regex Guards] ── Top Chunks
  (Clean 404 message)              │
                                   ▼ (Passed threshold >= 0.32)
                        [Groq LLM Reasoning]
                                   │
                                   ▼
                 [3 Key Timestamps + Embedded Player]
```

---

## 📁 Project Structure

```
ReDs/
├── extractor/                 # Python transcript scraper
│   ├── process_playlist.py    # Main playlist extraction CLI
│   ├── transcript_extractor.py # Reusable YouTube transcript engine
│   └── requirements.txt       # Python dependencies (yt-dlp, transcript API)
│
├── data/
│   ├── transcripts/           # Where extracted JSON transcripts are stored
│   └── sample_transcript.json # Reference format for transcript JSONs
│
├── backend/                   # Express.js REST API
│   ├── src/
│   │   ├── server.js          # App entry point (port 5000)
│   │   ├── routes/            # /api/search, /api/health
│   │   ├── services/          # Qdrant, Groq, Embedding & Query Understanding
│   │   └── utils/             # Timestamp & time formatting helpers
│   ├── scripts/
│   │   └── ingestTranscripts.js # Chunker & vector upsert script for Qdrant
│   ├── .env.example           # Environment template
│   └── package.json
│
└── frontend/                  # React + Vite application
    ├── src/
    │   ├── App.jsx            # Split layout (Desktop) / Popup flow (Mobile)
    │   ├── components/
    │   │   ├── SearchBar.jsx  # Search box + AI Understanding toggle
    │   │   ├── VideoPlayer.jsx # YouTube iframe with auto-seek
    │   │   └── TimestampList.jsx # 3 interactive timestamp pills
    │   └── index.css          # Minimal dark UI styles
    ├── vite.config.js         # Proxies /api to backend:5000
    └── package.json
```

---

## 🛠️ Step 1: Extract YouTube Transcripts

Extract transcripts directly from any YouTube playlist using the included Python extractor:

### 1. Install dependencies
```bash
pip install -r extractor/requirements.txt
```

### 2. Run the extractor
```bash
python extractor/process_playlist.py --playlist "https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID"
```

Useful flags:
- `--delay 2.0`: Seconds to wait between requests (default: 2.0s, helps avoid YouTube rate-limits).
- `--cooldown 60`: Cooldown time if temporary IP throttling occurs.
- `--output data/transcripts`: Target directory (defaults automatically to `data/transcripts/`).

> **Resumable**: If interrupted or rate-limited, re-run the same command anytime. It skips videos that have already been saved to disk.

---

## 🗄️ Step 2: Configure & Ingest into Qdrant

### 1. Configure the Backend `.env`
```bash
cd backend
cp .env.example .env
```

Add your keys to `backend/.env`:
```env
PORT=5000

# Free Groq key from https://console.groq.com/keys
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# Qdrant Vector Database (Local Docker or free Qdrant Cloud)
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION=reds_striver_dsa

# Embedding Model (runs locally in Node via ONNX; no key needed)
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

### 2. Ingest Transcripts
```bash
npm run ingest
```
This reads all JSON files in `data/transcripts/`, chunks them into 90-second overlapping windows, computes 384-dimensional embeddings locally, and upserts them into Qdrant with timestamp metadata.

---

## 🚀 Step 3: Run the Application

### 1. Start the Backend API
```bash
cd backend
npm start
# Server starts at http://localhost:5000
```

### 2. Start the Frontend UI
```bash
cd ../frontend
npm run dev
# App starts at http://localhost:3000
```

---

## 🧠 Key Highlights

- **Local ONNX Embeddings**: Runs `all-MiniLM-L6-v2` locally in Node via `@xenova/transformers`. Zero embedding API costs.
- **Optional AI Query Understanding**: Toggle switch in the search bar. When enabled, Groq normalizes shorthand/abbreviations before search; cached in-memory for 0ms replay.
- **Strict Query Guards**: Regex pre-check + 0.32 Cosine Similarity Floor ensures gibberish (`"abba dabba chabba"`) or off-topic queries are gracefully rejected without hallucinating lecture matches.
- **Embedded Player**: Seamless YouTube iframe seeks directly to selected timestamp seconds.
