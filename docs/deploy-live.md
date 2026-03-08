# Hosting FinSight AI at finsightai.com

You own **finsightai.com**. To run the app live you need to host three pieces and point the domain at the frontend.

---

## Quick order (do in this sequence)

1. **Deploy Backend (Render)** → copy its URL (e.g. `https://finsight-backend.onrender.com`).
2. **Deploy AI service (Render)** → add `GEMINI_API_KEY`, copy its URL (e.g. `https://finsight-ai-service.onrender.com`).
3. **Deploy Frontend (Vercel)** → set env vars `VITE_BACKEND_URL` and `VITE_AI_SERVICE_URL` to the two URLs above, then deploy.
4. **Add domain in Vercel** → add `www.finsightai.com` (and optionally `finsightai.com`), then in your domain registrar add the CNAME/A record Vercel shows.
5. **Redeploy frontend** after setting env vars so the build picks them up.

Repo is ready: `frontend/vercel.json`, `render.yaml`, and `frontend/.env.production.example` are in place.

---

## 1. What to host

| Piece | What it is | Where to host (examples) |
|-------|------------|---------------------------|
| **Frontend** | Static site (Vite build) | Vercel, Netlify, Cloudflare Pages |
| **Backend** (Person 2) | FastAPI on Python | Render, Railway, Fly.io, a VPS |
| **AI service** (Person 3) | FastAPI + RAG + Claude | Render, Railway, Fly.io, a VPS |

The frontend is the only part users hit in the browser. It calls the backend and AI service by URL, so those need public URLs (no localhost).

---

## 2. Recommended: Vercel (frontend) + Render (backend & AI)

### Frontend on Vercel (free tier)

1. Push the repo to GitHub (you already have [Sundeep-m-k/Finsightai](https://github.com/Sundeep-m-k/Finsightai)).
2. Go to [vercel.com](https://vercel.com) → Add New Project → Import the repo.
3. **Root Directory:** `frontend`.
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. **Environment variables** (so the app calls your deployed APIs):
   - `VITE_BACKEND_URL` = `https://your-backend.onrender.com` (from step below)
   - `VITE_AI_SERVICE_URL` = `https://your-ai-service.onrender.com` (from step below)
   - Do **not** set `VITE_USE_MOCK` (or set it to `false`).
7. Deploy. You’ll get a URL like `finsight-xxx.vercel.app`.

### Backend on Render (free tier)

1. [render.com](https://render.com) → New → Web Service → Connect the same GitHub repo.
2. **Root Directory:** `backend`
3. **Runtime:** Python 3
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. **Environment:** Add `PORT` if Render doesn’t set it (Render usually sets it automatically).
7. Deploy. Note the URL (e.g. `https://finsight-backend.onrender.com`).

### AI service on Render (free tier, may spin down when idle)

1. New Web Service again → same repo.
2. **Root Directory:** `ai-service`
3. **Build Command:**  
   `pip install -r requirements.txt && python -m app.rag.ingest`  
   (so the RAG index is built at deploy time). If the build times out (e.g. on free tier), run `python -m app.rag.ingest` once locally, commit `ai-service/app/kb/index/` to the repo, and remove the `&& python -m app.rag.ingest` part so deploy only runs `pip install`.
4. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment variables:**
   - `GEMINI_API_KEY` = your Google Gemini API key (required)
   - `FINNHUB_API_KEY` = optional, enables live ETF quotes in chat (VOO, QQQ, etc.)
   - Render sets `PORT` automatically.
6. Deploy. Note the URL (e.g. `https://finsight-ai-service.onrender.com`).

### Point finsightai.com at the frontend

**First:** In **Vercel** → your project → Settings → Domains → Add `www.finsightai.com`. Vercel will show the exact record to add (e.g. CNAME `www` → `cname.vercel-dns.com`). Add `finsightai.com` too if you want the root domain; Vercel will show A records for that.

**Then** add the matching records at your domain registrar (see below for **Squarespace Domains**).

After DNS propagates (often 5–30 minutes), https://www.finsightai.com will serve your app.

---

#### Using Squarespace Domains (finsightai.com)

If you bought finsightai.com through **Squarespace Domains**:

1. Log in at [squarespace.com](https://www.squarespace.com) → **Settings** → **Domains** (or go to [domains.squarespace.com](https://domains.squarespace.com)).
2. Click **finsightai.com** → **DNS Settings** (or **Advanced Settings** → **DNS**).  
   If you don’t see DNS, the domain may be “connected” to a Squarespace site; use **Use custom nameservers** or **DNS** if your plan allows it.
3. **For www.finsightai.com (recommended):**
   - Add a **CNAME** record:
     - **Host / Name:** `www` (or `www.finsightai.com` depending on the form).
     - **Value / Points to:** use the target Vercel shows (usually `cname.vercel-dns.com`).
   - Save. After propagation, **https://www.finsightai.com** will go to your Vercel app.
4. **For finsightai.com (root, optional):**
   - Vercel will show **A** records (e.g. `76.76.21.21`) when you add the root domain in Vercel.
   - In Squarespace DNS, add an **A** record:
     - **Host:** `@` or leave blank (meaning the root domain).
     - **Value:** the IP Vercel gives (e.g. `76.76.21.21`).
   - Squarespace may support only a limited set of A records; if so, use **www** as the main URL and redirect root to www in Vercel.

If your domain is on Squarespace but DNS is managed elsewhere, add the same CNAME (and A if needed) in that DNS provider instead. Propagation is usually 5–30 minutes; Vercel will show a checkmark when the domain is verified.

### Wire the frontend to the live APIs

After backend and AI service are deployed, set in Vercel:

- `VITE_BACKEND_URL` = your Render backend URL
- `VITE_AI_SERVICE_URL` = your Render AI service URL

Redeploy the frontend so the new env vars are baked into the build.

---

## 3. CORS

Backend and AI service already use `allow_origins=["*"]`, so they will accept requests from `https://www.finsightai.com`. No code change needed.

---

## 4. Optional: single server (VPS)

If you prefer one machine (e.g. DigitalOcean, Linode, EC2):

1. Install Python 3.11+, Node (for building frontend), and optionally nginx.
2. Build frontend: `cd frontend && npm run build`; serve the `dist/` folder (e.g. with nginx).
3. Run backend and AI service with uvicorn (or gunicorn) on two ports; put nginx in front as reverse proxy.
4. Point finsightai.com (and www) to the server’s IP with an A record; use nginx to serve the app and proxy `/api/backend` and `/api/ai` to the two services if you want to avoid CORS by same-origin.

---

## 5. Checklist before go-live

- [ ] Backend and AI service deployed and returning 200 on `/health`.
- [ ] AI service has `GEMINI_API_KEY` set; RAG ingest ran at build time.
- [ ] Frontend env: `VITE_BACKEND_URL` and `VITE_AI_SERVICE_URL` point to those deployed URLs.
- [ ] Domain: CNAME (or A) for www (and root) → frontend host; SSL is usually automatic (Vercel/Netlify/Render provide HTTPS).
- [ ] Test full flow: questionnaire → upload/sample → dashboard → chat on https://www.finsightai.com.

Once this is done, [finsightai.com](https://www.finsightai.com/) can serve the live app instead of the “Coming Soon” page.
