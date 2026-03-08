# FinSight AI Service (Person 3)

RAG knowledge base, Claude strategy engine, chat endpoint, and market data layer.

## Setup

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY (required for /strategy and /chat). Optional: FINNHUB_API_KEY for /market/quote.
```

## Build RAG index (run once, or after changing kb/raw content)

```bash
python -m app.rag.ingest
# Or from repo root: python scripts/ingest_kb.py
```

Output: `app/kb/index/` (FAISS index + docstore), `app/kb/processed/manifest.json`.

## Run the service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

- **GET /health** — health check
- **POST /strategy** — body: `{ "profile": UserProfile }` → InsightResponse
- **POST /chat** — body: `{ "message": "...", "session_id?": "...", "profile": UserProfile }` → `{ "message", "sources", "session_id" }`
- **GET /market/quote?symbol=VOO** — live quote (VOO, QQQ, BND, SPY, SCHD; requires Finnhub key)

## Contracts

- Input/output shapes match `../shared/schemas/` (profile.ts, insight.ts, api-types.ts).
- Mock data: `../shared/mock/mockProfile.json`, `../shared/mock/mockInsights.json`.
