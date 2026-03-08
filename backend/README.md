# FinSight Backend (Person 2)

Data engine: onboarding (questionnaire), transaction upload (CSV/Excel), behavioral signals, readiness scores, profile.

## Run

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **GET /health** — health check
- **POST /onboard** — body `{ "questionnaire": QuestionnaireSummary }` → `{ "session_id", "message" }`
- **POST /upload** — `?session_id=...` + multipart file (CSV/Excel) → `{ "session_id", "transactions_count", "profile" }`
- **POST /upload/sample** — `?session_id=...` (no file) → loads sample transactions, returns profile
- **GET /profile** — `?session_id=...` → full UserProfile

Profile shape matches `shared/schemas/profile.ts` (questionnaire, behavioral, saving_readiness_score, investment_readiness_score).
