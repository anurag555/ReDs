# ReDs — AI-Powered Video Lecture RAG Search

ReDs is a minimal, high-speed Video RAG (Retrieval-Augmented Generation) search engine built specifically for **Striver's A2Z DSA Lecture Series**.

When you search for any problem or algorithmic concept, ReDs embeds your query, searches vector representations in **Qdrant**, synthesizes an explanation via **Groq (LLaMA-3.3-70B)**, and pinpoints the **top 3 precise video timestamps** to jump directly to where Striver explains it.

---

## 📁 Architecture & Folder Structure

```
ReDs/
├── backend/                  # Node.js + Express API Backend
│   ├── .env                  # Environment secrets (Groq, Qdrant)
│   ├── .env.example          # Environment template
│   ├── package.json
│   ├── src/
│   │   ├── server.js         # Server entry point
│   │   ├── routes/           # REST endpoints (/api/search, /api/health)
│   │   ├── services/         # Embedding, Qdrant & Groq services
│   │   └── utils/            # Time parsing & formatting utilities
│   └── scripts/
│       └── ingestTranscripts.js # Ingests 305 transcripts into Qdrant
│
└── frontend/                 # React (Vite) Minimalist UI
    ├── package.json
    ├── vite.config.js        # Configured with proxy to port 5000
    ├── index.html
    └── src/
        ├── App.jsx           # Main layout (Desktop split / Mobile popup)
        ├── index.css         # Dark modern styling
        └── components/
            ├── SearchBar.jsx      # Search box & suggested DSA queries
            ├── VideoPlayer.jsx    # 16:9 embedded player with timestamp jump
            └── TimestampList.jsx  # Interactive 3-timestamp pills
```

---

## ⚙️ Backend Setup (`ReDs/backend`)

### 1. Environment Configuration (`.env`)

Open `ReDs/backend/.env` and insert your API keys:

```env
PORT=5000

# Groq API Key (Get free key at: https://console.groq.com)
GROQ_API_KEY=gsk_your_groq_api_key_here

# Qdrant Vector Database
# Local Qdrant (Docker): http://localhost:6333
# Qdrant Cloud: https://<cluster-id>.<region>.cloud.qdrant.io:6333
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

QDRANT_COLLECTION=reds_striver_dsa
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

> **Note on Embeddings:** ReDs generates high-speed 384-dimensional vector embeddings locally using `@xenova/transformers` (ONNX runtime in Node.js). You do not need a paid OpenAI embedding key.

---

### 2. Ingesting Transcripts into Qdrant

To chunk and vectorize the 305 extracted Striver DSA transcripts into Qdrant:

```bash
cd ReDs/backend
npm run ingest
```

This script:
1. Connects to your Qdrant instance.
2. Creates the collection `reds_striver_dsa` with Cosine distance.
3. Chunks the 305 transcripts into time windows (60–90 seconds).
4. Generates dense vector embeddings.
5. Upserts points into Qdrant with rich payload metadata (video ID, title, start seconds, timestamp URL).

---

### 3. Start the Backend Server

```bash
cd ReDs/backend
npm start
```

The backend starts on `http://localhost:5000`.  
Check status anytime at: `http://localhost:5000/api/health`.

---

## 💻 Frontend Setup (`ReDs/frontend`)

### 1. Start the React App

```bash
cd ReDs/frontend
npm run dev
```

The app will open at: `http://localhost:3000`.

---

## 📱 User Experience & Features

* **Desktop View:**
  * Clean, minimal split-screen design.
  * Left: Search bar with instant suggestions + AI explanation summary.
  * Right: Dedicated video player window that embeds YouTube and immediately seeks to the chosen timestamp.
  * 3 Interactive Timestamp Pills: Click any pill to jump to that moment in the video.

* **Mobile View:**
  * Minimal, distraction-free search interface.
  * On search, the video window pops up with the 3 timestamps directly underneath.
  * A "New Query" button allows one-tap reset to search again.

