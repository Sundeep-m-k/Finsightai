# How to Run FinSight AI

---

## Verify locally before push

1. **Free ports 8000 and 8001** (or use 8010/8011 and set `VITE_BACKEND_URL` / `VITE_AI_SERVICE_URL` when running the frontend). If something else uses 8000 (e.g. another app), start the backend on another port, e.g. `uvicorn app.main:app --port 8010` in `backend/`, and `--port 8011` in `ai-service/`.

2. **Start backend and AI service** (two terminals):
   ```bash
   # Terminal 1
   cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

   # Terminal 2
   cd ai-service && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```

3. **Run the flow test script** (from repo root):
   ```bash
   chmod +x scripts/test-local-flow.sh
   ./scripts/test-local-flow.sh
   ```
   You should see: Health OK → Onboard → Upload sample → Get profile → Strategy (may fail if `ANTHROPIC_API_KEY` is not set; that’s OK for backend check).

4. **Start the frontend** and test in the browser:
   ```bash
   cd frontend && npm run dev
   ```
   Open http://localhost:5173 → Get started → fill questionnaire → Use sample data → See my plan → Dashboard (and Chat). If backend/AI use different ports, run: `VITE_BACKEND_URL=http://127.0.0.1:8010 VITE_AI_SERVICE_URL=http://127.0.0.1:8011 npm run dev`.

---

## Prerequisites

- **Python 3.11+**
- **Anthropic API key** (for `/strategy` and `/chat`)
- Optional: **Finnhub API key** (for live `/market/quote` and chat price lookup)

---

## 1. AI Service (Person 3)

### 1.1 Setup (first time only)

```bash
cd ai-service

# Create virtual environment
python3 -m venv .venv

# Activate it
# Linux/macOS:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env example and add your keys
cp .env.example .env
# Edit .env and set:
#   ANTHROPIC_API_KEY=sk-ant-...
#   FINNHUB_API_KEY=...   (optional)
```

### 1.2 Build the RAG index (first time, or after changing `app/kb/raw/`)

From **inside** `ai-service/` with the venv activated:

```bash
python -m app.rag.ingest
```

You should see: `Ingested 18 chunks.` (or similar). This creates `app/kb/index/` (FAISS index + docstore).

**Alternative** from repo root (using the script):

```bash
cd /path/to/Finsightai
ai-service/.venv/bin/python scripts/ingest_kb.py
```

### 1.3 Start the API server

From **inside** `ai-service/` with the venv activated:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

- API base URL: **http://localhost:8001**
- Docs: **http://localhost:8001/docs**

### 1.4 Quick test

**Health:**
```bash
curl http://localhost:8001/health
```

**Strategy** (with a profile in the body; use `shared/mock/mockProfile.json`):
```bash
curl -X POST http://localhost:8001/strategy \
  -H "Content-Type: application/json" \
  -d @../shared/mock/mockProfile.json
```

**Chat:**
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is an emergency fund?", "profile": <paste mockProfile.json content>}'
```

---

## 2. Shared (no server)

The **shared/** folder contains TypeScript schemas and JSON mocks. It is used by the frontend (Person 1) and by the ai-service (which mirrors the types in Python). There is nothing to “run” here—it’s a contract and data layer.

---

## 3. Frontend (Person 1)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Flow: Landing → Onboarding → Upload → Gap Reveal → Dashboard → Chat.

- **Mock mode:** Set `VITE_USE_MOCK=true` in `frontend/.env` to use mock strategy/chat (no ai-service needed).
- **Live AI:** Leave `VITE_USE_MOCK` unset or `false` and set `VITE_AI_SERVICE_URL=http://localhost:8001` so the frontend calls the ai-service for strategy and chat.

## 4. Backend (Person 2)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**. The frontend uses `VITE_BACKEND_URL` (default `http://localhost:8000`) for onboarding and upload. Flow: POST /onboard (questionnaire) → POST /upload or POST /upload/sample → GET /profile.

---

## Summary

| What | Command | Where |
|------|---------|--------|
| AI service: venv + install | `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt` | `ai-service/` |
| AI service: env | `cp .env.example .env` and set `ANTHROPIC_API_KEY` | `ai-service/` |
| AI service: ingest | `python -m app.rag.ingest` | `ai-service/` (venv active) |
| AI service: run | `uvicorn app.main:app --reload --port 8001` | `ai-service/` (venv active) |
| Frontend: install + run | `npm install && npm run dev` | `frontend/` |
| Backend: venv + run | `uvicorn app.main:app --reload --port 8000` | `backend/` (venv active) |

**Full stack:** Start backend (8000), ai-service (8001), then frontend (5173). Open http://localhost:5173 and go through the flow (`npm run dev` in `frontend/`). Open http://localhost:5173 and go through the flow. Use “Use sample data” on Upload to skip file upload.
