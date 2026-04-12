# 🚂 Railway Kiosk — RAG-Enhanced Voice Bot

**Stack:** Node.js + Express · Gemini (Embeddings + LLM) · Pinecone (Vector DB) · Sarvam AI (STT/TTS)

---

## Architecture

```
User (Voice/Text)
        │
        ▼
┌──────────────────────────────────────────────────┐
│              Frontend (React + Vite)             │
│  VoiceBot.jsx ──► AdminPanel.jsx (RAG Admin)     │
│  Voice/Text input + RAG source indicator         │
└───────────┬──────────────────────────────────────┘
            │ HTTP
            ▼
┌──────────────────────────────────────────────────┐
│           Backend (Node.js + Express)            │
│                                                  │
│  /voice ──► STT (Sarvam) ──► Intent + RAG        │
│  /text  ──────────────────► Intent + RAG         │
│  /query ──────────────────► RAG only (JSON)      │
│  /ingest ──────────────────► RAG pipeline        │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │           RAG Pipeline                   │   │
│  │                                          │   │
│  │  PDF/CSV/JSON/TXT/API                    │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │   Chunker (500 chars, 80 overlap)        │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │   Gemini text-embedding-004 (768-dim)    │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │   Pinecone Upsert ────────────────────►  │   │
│  │                         Pinecone Index   │   │
│  │   User Query                   │         │   │
│  │       │                        │         │   │
│  │       ▼                        ▼         │   │
│  │   Embed Query ◄─── Top-5 Context Chunks  │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │   Gemini 1.5 Flash (RAG Generation)      │   │
│  │       │                                  │   │
│  │       ▼                                  │   │
│  │   Response Text                          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│       │ TTS (Sarvam bulbul:v2)                   │
│       ▼                                          │
│   Audio WAV response                            │
└──────────────────────────────────────────────────┘
            │
            ▼
     GCP / AWS Cloud
```

---

## Folder Structure

```
railway-rag/
├── backend/
│   ├── server.js              ← Express server (all routes)
│   ├── intent.js              ← Existing intent engine (copy from original)
│   ├── sarvam.js              ← Existing STT/TTS (copy from original)
│   ├── package.json
│   ├── .env.example
│   ├── rag/
│   │   └── pipeline.js        ← RAG: chunk → embed → store → retrieve → generate
│   ├── scripts/
│   │   ├── ingest-sample.js   ← Pre-load sample railway data
│   │   └── ingest-live.js     ← Fetch live IRCTC/API data
│   └── data/                  ← Auto-created for uploaded files
├── frontend/
│   ├── src/
│   │   ├── VoiceBot.jsx       ← Main UI (with RAG source indicator)
│   │   ├── AdminPanel.jsx     ← RAG admin (upload, test, manage)
│   │   ├── api.js             ← API client
│   │   ├── rag-admin.css      ← Admin panel styles
│   │   ├── App.jsx            ← Root app
│   │   └── index.css          ← Main styles (keep existing)
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Setup Instructions

### Step 1: Get API Keys

| Service | Where to get | Required |
|---------|-------------|----------|
| **Gemini** | https://aistudio.google.com/app/apikey | ✅ Yes |
| **Pinecone** | https://app.pinecone.io | ✅ Yes |
| **Sarvam AI** | https://app.sarvam.ai | ✅ Yes (STT/TTS) |
| **IRCTC API** | https://rapidapi.com/search/irctc | Optional |

### Step 2: Backend Setup

```bash
# 1. Merge with existing project
cd railway-updated/backend

# 2. Copy new files
cp -r /path/to/railway-rag/backend/rag ./
cp /path/to/railway-rag/backend/scripts ./
cp /path/to/railway-rag/backend/server.js ./server.js   # replaces existing

# 3. Install new dependencies
npm install @google/generative-ai @pinecone-database/pinecone pdf-parse csv-parse

# 4. Set up environment
cp .env.example .env
# Edit .env and add: GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX=railway-kiosk

# 5. Load sample data into Pinecone (first time only)
node scripts/ingest-sample.js

# 6. Start server
npm start
```

### Step 3: Frontend Setup

```bash
cd railway-updated/frontend

# Copy new components
cp /path/to/railway-rag/frontend/src/VoiceBot.jsx ./src/
cp /path/to/railway-rag/frontend/src/AdminPanel.jsx ./src/
cp /path/to/railway-rag/frontend/src/api.js ./src/
cp /path/to/railway-rag/frontend/src/rag-admin.css ./src/

# Add to your src/index.css (or App.jsx):
# import './rag-admin.css'

npm run dev
```

### Step 4: Verify Everything Works

```bash
# 1. Health check with Pinecone stats
curl http://localhost:5000/health

# 2. Test RAG query (text, no audio)
curl -X POST http://localhost:5000/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Which platform is Mumbai Rajdhani on?", "language": "en-IN"}'

# 3. Check Pinecone vectors
curl http://localhost:5000/ingest/stats
```

---

## Uploading Your Own Data

### Via API (curl)

```bash
# Upload a PDF timetable
curl -X POST http://localhost:5000/ingest \
  -F "files=@timetable_2025.pdf" \
  -F "namespace=timetables"

# Upload a CSV schedule
curl -X POST http://localhost:5000/ingest \
  -F "files=@train_schedule.csv" \
  -F "namespace=schedules"

# Feed live API data
curl -X POST http://localhost:5000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [{
      "type": "api",
      "url": "https://your-irctc-api.com/trains",
      "namespace": "live"
    }]
  }'

# Clear and re-ingest
curl -X POST http://localhost:5000/ingest \
  -F "files=@new_data.pdf" \
  -F "clearFirst=true"
```

### Via Admin Panel (UI)

1. Click the ⚙️ button in the top-right of the kiosk
2. Drag & drop PDF/CSV/JSON/TXT files
3. Optionally paste inline text or an API URL
4. Set a namespace (e.g. "schedules", "faqs")
5. Click **Start Ingestion**
6. Test with the **Test RAG** tab

---

## Scheduled Live Data Refresh (Production)

Add a cron job to refresh live train data every 6 hours:

```bash
# Edit crontab
crontab -e

# Add this line:
0 */6 * * * cd /path/to/backend && node scripts/ingest-live.js >> /var/log/railway-ingest.log 2>&1
```

---

## Cloud Deployment (GCP / AWS)

### GCP Cloud Run

```bash
# Build Docker image
docker build -t railway-rag-backend ./backend

# Push to GCR
docker tag railway-rag-backend gcr.io/YOUR_PROJECT/railway-rag-backend
docker push gcr.io/YOUR_PROJECT/railway-rag-backend

# Deploy to Cloud Run
gcloud run deploy railway-rag-backend \
  --image gcr.io/YOUR_PROJECT/railway-rag-backend \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=xxx,PINECONE_API_KEY=xxx,SARVAM_API_KEY=xxx

# Frontend: deploy to Firebase Hosting or Cloud Storage + CDN
```

### AWS (ECS + Fargate)

```bash
# Build + push to ECR
aws ecr create-repository --repository-name railway-rag-backend
docker build -t railway-rag-backend .
docker tag railway-rag-backend:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/railway-rag-backend
docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/railway-rag-backend

# Create ECS task definition and Fargate service (use AWS Console or CDK)
# Use AWS Secrets Manager for API keys
```

### Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server + Pinecone status |
| `/voice` | POST | Audio → STT → RAG → TTS |
| `/text` | POST | Text → RAG → TTS |
| `/query` | POST | Text → RAG → JSON (no audio) |
| `/ingest` | POST | Upload files/text → Pinecone |
| `/ingest/stats` | GET | Pinecone index statistics |
| `/ingest/clear` | DELETE | Wipe Pinecone index |

---

## Response Source Indicators

The UI shows which system answered each query:

| Source | Meaning | When triggered |
|--------|---------|----------------|
| 🧠 **RAG · Pinecone + Gemini** | Retrieved from vector DB + AI generated | Complex queries, knowledge base hits |
| ⚡ **Intent Engine** | Fast static response | Greetings, farewells, PNR, tickets |
| 🔄 **Fallback** | Static text (RAG failed) | Network errors, low confidence |

---

## Troubleshooting

**"No relevant documents found"**  
→ Run `node scripts/ingest-sample.js` to load sample data

**Pinecone 404 / index not found**  
→ The index auto-creates on first ingest. Wait 30-60 seconds after creation.

**Gemini quota exceeded**  
→ Free tier has 60 RPM. Use `gemini-1.5-flash` (already set). For production, upgrade API plan.

**Empty RAG responses**  
→ Check that `GEMINI_API_KEY` is valid in `.env`. Run the Test RAG tab in admin panel.

**STT not working**  
→ ffmpeg must be installed: `apt install ffmpeg` (Linux) or `brew install ffmpeg` (Mac)
