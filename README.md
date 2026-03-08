# FinSight AI

> **A mentor, not a calculator.** AI-powered personal finance coaching for college students.

FinSight AI reveals the gap between what you *think* you spend and what your bank *actually* shows — then delivers a personalized financial plan with readiness scores, a 90-day action timeline, live ETF market data, and a conversational AI coach backed by government and academic sources.

**Live demo:** [finsightai.com](https://www.finsightai.com)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend](#1-backend-port-8000)
  - [2. AI Service](#2-ai-service-port-8001)
  - [3. Frontend](#3-frontend-port-5173)
- [Environment Variables](#environment-variables)
- [Scoring Model](#scoring-model)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## Features

| Feature | Description |
|---|---|
| **Onboarding questionnaire** | Captures income, expenses, loans, credit card balance, goal, risk tolerance, and time horizon |
| **Transaction upload** | Parses CSV / Excel bank exports; categorizes every transaction automatically |
| **Gap Reveal** | Compares stated vs. actual spending per category (red / amber / green) |
| **Readiness scores** | Two proprietary 0–10 scores: Saving Readiness and Investment Readiness |
| **AI narrative** | Google Gemini verbalizes a personalized plan from deterministic financial inputs |
| **90-day action plan** | Concrete monthly savings targets, debt paydown goals, and ETF suggestions |
| **Behavioral signals** | Flags like `subscription_creep`, `high_credit_utilization`, `lifestyle_creep`, and more |
| **Live watchlist** | Real-time VTI / VOO / SPY prices via Finnhub WebSocket |
| **AI chat** | Multi-turn conversational coach with RAG retrieval + live web search and source citations |
| **Mock mode** | Full frontend demo with no backend required (`VITE_USE_MOCK=true`) |
| **Dark mode** | System-aware light/dark theme toggle |

---

## Architecture

Three independently deployable services communicate over HTTP:

```
Browser
  │
  ├── POST /onboard, /upload, /profile, /score   ──▶  Backend  (port 8000)
  │                                                      │
  │                                                      └── Finnhub WebSocket (live prices)
  │
  └── POST /strategy, /chat                       ──▶  AI Service  (port 8001)
                                                          │
                                                          ├── FAISS vector store (RAG)
                                                          ├── Google Gemini (LLM)
                                                          └── DuckDuckGo Search (live web)
```

**Key design decisions:**

- **Deterministic-first, LLM-second.** All financial numbers (savings targets, ETF picks, emergency fund milestones) are computed from the user profile with transparent math. Gemini is only called to verbalize the result into prose. If the LLM call fails, a deterministic fallback narrative is served automatically.
- **Hybrid RAG in chat.** Concept questions trigger a live DuckDuckGo + BeautifulSoup web search *in addition to* FAISS retrieval. Plan questions use the internal knowledge base only.
- **Strategy caching.** Results are keyed by a SHA-256 hash of the serialized profile — refreshing the dashboard never burns API quota.
- **No database.** Session state lives in Python dicts. Sessions are lost on server restart; this was an intentional scope decision. Use the "sample data" path to demo without uploading real bank statements.

---

## Tech Stack

**Frontend**
- React 18 + TypeScript, Vite 5, Tailwind CSS 3
- React Router v6, Recharts, Lucide React
- Deployed on **Vercel**

**Backend**
- FastAPI + Uvicorn (Python 3.11+)
- Pandas, NumPy, openpyxl (transaction parsing)
- Finnhub WebSocket relay (live ETF prices)
- Deployed on **Render**

**AI Service**
- FastAPI + Uvicorn (Python 3.11+)
- Google Gemini (`google-generativeai`)
- `sentence-transformers` (`all-MiniLM-L6-v2`) + FAISS (RAG)
- DuckDuckGo Search + BeautifulSoup4 (live web retrieval)
- Knowledge base sources: CFPB, investor.gov, OpenStax
- Deployed on **Render**

---

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.11+**
- **Google Gemini API key** — required for `/strategy` and `/chat`
- **Finnhub API key** — optional; enables live ETF quotes in chat and the watchlist

Clone the repo:

```bash
git clone https://github.com/Sundeep-m-k/Finsightai.git
cd Finsightai
```

---

### 1. Backend (port 8000)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

---

### 2. AI Service (port 8001)

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy env and add your keys
cp .env.example .env
# Set GEMINI_API_KEY (required) and FINNHUB_API_KEY (optional) in .env

# Build the RAG index (first time, or after changing app/kb/raw/)
python -m app.rag.ingest
# Expected output: "Ingested N chunks."

uvicorn app.main:app --reload --port 8001
```

API docs: http://localhost:8001/docs

---

### 3. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and walk through the flow:

**Landing → Onboarding → Upload → Gap Reveal → Dashboard → Chat**

Use **"Use sample data"** on the Upload page to skip file upload and immediately see the full dashboard experience.

**Mock mode** (no backend or AI service needed):

```bash
VITE_USE_MOCK=true npm run dev
```

---

## Environment Variables

### AI Service (`ai-service/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for strategy and chat |
| `FINNHUB_API_KEY` | No | Live ETF quote lookup in chat responses |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Backend service URL |
| `VITE_AI_SERVICE_URL` | `http://localhost:8001` | AI service URL |
| `VITE_USE_MOCK` | `false` | Set `true` to bypass all API calls and use mock data |

---

## Scoring Model

All scores are computed deterministically in the backend — the LLM never touches the numbers.

**Saving Readiness Score** (0–10):

$$S = 0.30 \cdot E + 0.25 \cdot C + 0.25 \cdot D + 0.20 \cdot I$$

Where:
- $E$ = Emergency fund coverage (months of expenses covered)
- $C$ = Savings consistency (month-over-month regularity)
- $D$ = Debt-to-income score (inverted DTI ratio)
- $I$ = Income stability score

**Investment Readiness Score** (0–10):

Derived from $S$ plus bonuses for investable surplus, time horizon, and risk tolerance — minus a credit card utilization penalty.

**Behavioral signals** detected from transaction data:

`high_credit_utilization` · `spending_gap` · `no_emergency_fund` · `high_debt_burden` · `irregular_income` · `lifestyle_creep` · `subscription_creep` · `dining_overspend`

---

## Deployment

The repo ships with ready-to-use deployment configuration:

| File | Purpose |
|---|---|
| `render.yaml` | Render service definitions for backend + AI service |
| `frontend/vercel.json` | Vercel routing config for the SPA |
| `frontend/.env.production.example` | Production env var template |

**Recommended stack:** Vercel (frontend) + Render (backend & AI service)

See [`docs/deploy-live.md`](docs/deploy-live.md) for the full step-by-step deployment and DNS configuration guide.

**Quick order:**
1. Deploy backend on Render → copy its URL
2. Deploy AI service on Render (set `GEMINI_API_KEY`) → copy its URL
3. Deploy frontend on Vercel (set `VITE_BACKEND_URL` + `VITE_AI_SERVICE_URL`)
4. Add your domain in Vercel and point DNS

---

## Project Structure

```
Finsightai/
├── frontend/          # React + TypeScript SPA (Vercel)
│   ├── src/
│   │   ├── pages/     # Landing, Onboarding, Upload, GapReveal, Dashboard, Chat
│   │   └── components/
│   └── vercel.json
│
├── backend/           # FastAPI — data ingestion, scoring, WebSocket relay (Render)
│   └── app/
│       ├── main.py
│       ├── session_store.py
│       └── routes/    # /onboard, /upload, /profile, /score, /ws/market
│
├── ai-service/        # FastAPI — RAG, Gemini, chat (Render)
│   └── app/
│       ├── main.py
│       ├── kb/        # Knowledge base (raw Markdown + FAISS index)
│       ├── rag/       # Ingest + retrieval pipeline
│       └── llm/       # Gemini, Claude, Ollama clients
│
├── shared/            # TypeScript schemas + JSON mocks (contract layer)
├── scripts/           # Local test scripts
└── docs/
    ├── run.md         # Local setup guide
    └── deploy-live.md # Production deployment guide
```

---

## Disclaimer

FinSight AI provides educational financial information only. It is not a licensed financial advisor. All content is sourced from CFPB, investor.gov, and OpenStax — not financial product recommendations.
