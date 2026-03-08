# Person 1 — Frontend To-Do (Detailed)

You are building **all the screens and UI** for FinSight AI — a personal finance mentor for college students. This doc tells you exactly what to build, in what order, and where the data comes from.

---

## 1. What FinSight AI Is (Product in One Sentence)

College students answer a short questionnaire and upload transaction data (or use sample data). The app shows them **where their money really goes**, two **readiness scores** (Saving and Investment, 0–10), and a **personalized, cited action plan** from the AI. They can then **chat** to ask follow-up questions and see **live prices** for beginner-friendly tickers (e.g. VOO).

---

## 2. Where Your Data and Types Come From

- **TypeScript types**  
  Use (or re-export) the types from the **shared** folder. Do not redefine them in the frontend.
  - `shared/schemas/profile.ts` → `UserProfile`, `QuestionnaireSummary`, `BehavioralProfile`, etc.
  - `shared/schemas/insight.ts` → `InsightResponse`, `Insight`, `Source`, `ActionStep`
  - `shared/schemas/api-types.ts` → `StrategyRequest`, `StrategyResponse`, `ChatRequest`, `ChatResponse`, `QuoteResponse`
  - `shared/constants/badges.ts` → `BadgeType`, `BADGE_LABELS`, `BADGE_COLORS`

- **Mock data (for development before backend/ai-service are ready)**  
  - `shared/mock/mockProfile.json` — one full `UserProfile` (questionnaire + behavioral + scores).
  - `shared/mock/mockInsights.json` — one full `InsightResponse` (insights, action_plan, narrative, disclaimer).

- **APIs you will call**  
  - **Backend (Person 2):** onboarding, upload, scoring, profile. You’ll get a **UserProfile** from here (or from mock).
  - **AI service (Person 3):**  
    - `POST /strategy` — send `{ profile: UserProfile }`, get back **InsightResponse**.  
    - `POST /chat` — send `{ message, session_id?, profile: UserProfile }`, get back `{ message, sources?, session_id }`.  
    - `GET /market/quote?symbol=VOO` — optional; get live price for VOO, QQQ, BND, SPY, SCHD.

---

## 3. Recommended Build Order

Do these in order so each screen has the data it needs.

1. **Setup + shared** — Use shared types and mocks; one “data source” (mock or API).
2. **Landing** — Single marketing/entry page with CTA to start.
3. **Onboarding** — Questionnaire; collect answers and build/save something that will become `UserProfile.questionnaire`.
4. **Upload** — File upload for transactions (or “use sample data”); call backend when ready.
5. **Gap Reveal** — Show “said vs reality” and behavioral flags (needs `UserProfile.behavioral`).
6. **Dashboard** — Scores + insights + action plan + narrative (needs `UserProfile` + `InsightResponse`).
7. **Chat** — Conversation UI with source pills (needs `UserProfile` + chat API).
8. **Polish** — Loading, errors, empty states, disclaimer, responsive.

---

## 4. To-Do by Screen / Area

### 4.1 Setup and shared usage

- [ ] **Use shared types in the frontend**  
  - Import from `../shared/schemas/...` and `../shared/constants/badges`.  
  - Optionally re-export in `frontend/src/types/` for convenience; do not change the shapes.

- [ ] **Central “data source” for profile and insights**  
  - e.g. `lib/api.ts` or `lib/mockData.ts`:  
    - `getProfile()` → returns `UserProfile` (from mock or from backend).  
    - `getInsights(profile)` or `getStrategy(profile)` → returns `InsightResponse` (from mock or from `POST /strategy`).  
  - Use a single place so you can switch mock ↔ API by env or flag.

- [ ] **Environment / config**  
  - Base URL for backend (Person 2).  
  - Base URL for AI service (Person 3), e.g. `http://localhost:8001`.  
  - Use these in your API layer so you can change them without touching every screen.

---

### 4.2 Landing page

- [ ] **Single entry page**  
  - Short value prop: e.g. “Understand your money, get a plan, know when you’re ready to invest.”
  - One clear CTA: “Get started” or “Start” → goes to **Onboarding**.

- [ ] **No auth required**  
  - For the hackathon, you can use a simple “session” (e.g. stored in state or localStorage) so the same user flows through onboarding → upload → gap → dashboard → chat.

---

### 4.3 Onboarding page

- [ ] **Questionnaire that matches `QuestionnaireSummary`**  
  Collect (at least):  
  - Income (monthly), expenses (monthly).  
  - Loan balance, credit card balance (optional but useful).  
  - **Primary goal:** one of `debt_payoff` | `emergency_fund` | `investing` | `budgeting` (use a selector, not free text).  
  - Risk tolerance: `low` | `medium` | `high` (optional).  
  - Months until graduation (optional).

- [ ] **Use shared types**  
  - Store answers in an object that matches `QuestionnaireSummary` (see `shared/schemas/profile.ts`).

- [ ] **Navigation**  
  - “Next” / “Back” if multi-step; on submit → go to **Upload** (or to a “processing” step if backend will compute profile later).

- [ ] **Handoff**  
  - When backend (Person 2) is ready: submit questionnaire to backend and get back a session/user id; later you’ll get full `UserProfile` from backend. Until then, merge questionnaire with mock behavioral + scores for a full `UserProfile`.

---

### 4.4 Upload page

- [ ] **Upload area**  
  - User can drag-and-drop or select a file (CSV or Excel) for transaction history.

- [ ] **“Use sample data” option**  
  - If no file selected, allow “Use sample data” so the app can still run with mock profile (e.g. `mockProfile.json`).

- [ ] **Status**  
  - Show “Uploading…”, “Processing…”, “Done” or “Error”.  
  - On success → navigate to **Gap Reveal** (or to Dashboard if you skip a dedicated gap screen).

- [ ] **Backend integration (when ready)**  
  - Send file to Person 2’s upload endpoint; backend returns or updates profile. Your app then fetches `UserProfile` and uses it for Gap Reveal and Dashboard.

---

### 4.5 Gap Reveal page

- [ ] **Purpose**  
  - Show the “said vs reality” gap and behavioral flags so the student sees where their money actually goes before seeing the AI plan.

- [ ] **Data**  
  - `UserProfile.behavioral`:  
    - `said_vs_actual_gap_pct` — show as a clear number or short sentence (e.g. “You thought you spent X% less than you actually did”).  
    - `flags` — list of flags like `spending_gap`, `no_emergency_fund`, `high_credit_utilization`, etc.  
  - Optionally: `expense_breakdown` (categories and amounts/percentages).

- [ ] **UI**  
  - At least: one “gap” card or sentence; a list or set of **flag badges** (e.g. `FlagBadge` component).  
  - Optional: simple table or chart for “said vs reality” and/or expense breakdown (see shared structure: `SaidVsRealityTable`, `GapRevealCard` in your planned components).

- [ ] **Next step**  
  - Button: “See my plan” or “Go to dashboard” → **Dashboard**.

---

### 4.6 Dashboard page (critical — Hour 3 handoff)

This is where **InsightResponse** from Person 3 is used. Every field below comes from `InsightResponse` or `UserProfile`.

- [ ] **Scores (from `UserProfile`)**  
  - **Saving Readiness Score** — number 0–10 (e.g. `ScoreGauge` or `ScoreCard`).  
  - **Investment Readiness Score** — number 0–10.  
  - Label clearly so the student understands “out of 10”.

- [ ] **Insights (from `InsightResponse.insights`)**  
  - For each insight show:  
    - **Recommendation** (main line of advice).  
    - **Principle** (why it matters).  
    - **Behavioral flags** that triggered it (optional short list or pills).  
    - **Sources** — use `CitationPills`: for each `Source` show a small pill/badge with:  
      - `title` (and optionally `url` as link).  
      - Color or style by `badge_type` (use `BADGE_LABELS` / `BADGE_COLORS` from `shared/constants/badges.ts`: government, academic, market, finsight-kb).  
    - Optional: “Why this?” expandable that shows `preview` and `relevance_score` for each source.

- [ ] **90-day action plan (from `InsightResponse.action_plan`)**  
  - List of steps. Each step has:  
    - `time_label` (e.g. “Month 1”, “Month 2”, “Month 3”).  
    - `title`.  
    - `description`.  
  - Use a timeline or step list (e.g. `ActionPlanTimeline`).

- [ ] **Narrative (from `InsightResponse.narrative`)**  
  - One short mentor-style paragraph. Show it prominently (e.g. above or below the plan).

- [ ] **Disclaimer (from `InsightResponse.disclaimer`)**  
  - Show the full disclaimer text (e.g. at bottom of dashboard or in a small footer). Do not hide it.

- [ ] **Loading and error**  
  - While calling `POST /strategy`: show a loader.  
  - On error: show a clear message and optional “Retry”.

- [ ] **Data flow**  
  - Dashboard has access to `UserProfile` (from onboarding + upload/backend).  
  - Call `POST /strategy` with `{ profile }` and display the returned `InsightResponse`.  
  - Until AI service is ready, use `shared/mock/mockInsights.json` so you can build and test the layout.

---

### 4.7 Chat page

- [ ] **Purpose**  
  - Student can ask follow-up questions (e.g. “What’s an emergency fund?”, “What is VOO trading at?”) and get answers that use their profile and show sources.

- [ ] **Data**  
  - You need the same `UserProfile` as on the dashboard (and optionally `session_id` from a previous chat response).  
  - Send `ChatRequest`: `{ message, session_id?, profile }`.  
  - Receive `ChatResponse`: `{ message, sources?, session_id }`.

- [ ] **UI**  
  - **Chat window** — list of messages (user + assistant).  
  - **Input** — text box + send button.  
  - **Message bubble** — for assistant messages, optionally show **source pills** below the message using `sources` (same `Source` type and `CitationPills` / badge styling as on dashboard).  
  - Store `session_id` from the response and send it with the next message so the conversation stays in context.

- [ ] **Live quote**  
  - If the user asks “What is VOO at?” the AI service will include the live price in its reply and may attach a “market” source. You only need to display the message and the sources; no extra frontend call to `/market/quote` unless you want a dedicated “quote” widget.

- [ ] **Loading**  
  - While waiting for `POST /chat`, show typing indicator or “Thinking…”.

---

### 4.8 Common components and layout

- [ ] **Layout**  
  - Navbar and/or sidebar so the user can go: Landing → Onboarding → Upload → Gap Reveal → Dashboard → Chat.  
  - Use your existing layout components (`Navbar`, `Sidebar`, `PageShell`).

- [ ] **Citation pills**  
  - Component that takes `sources: Source[]` and renders a pill per source:  
    - Label from `title` (or `BADGE_LABELS[badge_type]`).  
    - Color from `BADGE_COLORS[badge_type]`.  
    - Link to `url` if present.  
  - Use the same component on **Dashboard** (under each insight) and on **Chat** (under assistant messages that have `sources`).

- [ ] **Score display**  
  - Reusable score component (e.g. gauge or card) for 0–10 scores. Use for Saving and Investment readiness on the dashboard.

- [ ] **Loading and errors**  
  - `Loader`, `ErrorBanner`, `EmptyState` as needed across onboarding, upload, dashboard, and chat.

---

## 5. API Integration Checklist

- [ ] **Backend (Person 2)**  
  - Know the base URL and endpoints for: onboarding submit, upload, get profile (or get scores).  
  - When you have a “current profile”, store it (e.g. in context or state) and pass it to Dashboard and Chat.

- [ ] **AI service (Person 3)**  
  - **Strategy:** `POST {AI_SERVICE_URL}/strategy` with body `{ profile: UserProfile }`.  
    - Response: `InsightResponse` (insights, action_plan, narrative, disclaimer).  
  - **Chat:** `POST {AI_SERVICE_URL}/chat` with body `{ message, session_id?, profile }`.  
    - Response: `{ message, sources?, session_id }`.  
  - **Quote (optional):** `GET {AI_SERVICE_URL}/market/quote?symbol=VOO`.  
  - Handle CORS (ai-service allows `*`; if you hit issues, confirm the frontend origin).

- [ ] **Mock fallback**  
  - If backend or AI service is not available, use `shared/mock/mockProfile.json` and `shared/mock/mockInsights.json` so you can develop and demo the full flow.

---

## 6. Hour 3 Handoff (Important)

By **Hour 3**, the **InsightResponse** shape must be fixed so you can wire the dashboard. It is already defined in:

- `shared/schemas/insight.ts`  
- `shared/mock/mockInsights.json`

Use these as the single source of truth. Do not change field names (e.g. `action_plan`, `sources`, `badge_type`) without agreeing with Person 3. Your job is to **render** this response on the Dashboard and to show **sources** as citation pills on Dashboard and in Chat.

---

## 7. Quick Reference — Key Types

```ts
// Profile (from backend or mock)
UserProfile: { questionnaire, behavioral, saving_readiness_score, investment_readiness_score }

// Strategy response (from POST /strategy or mockInsights.json)
InsightResponse: { insights[], action_plan[], narrative, disclaimer }
Insight: { recommendation, principle, behavioral_flags[], sources[] }
Source: { title, url, preview, relevance_score, badge_type }
ActionStep: { title, description, time_label }

// Chat
ChatRequest: { message, session_id?, profile }
ChatResponse: { message, sources?, session_id }
```

---

## 8. Summary Checklist for Person 1

1. Use **shared** types and mocks; add API layer with mock/real switch.  
2. Build **Landing** → **Onboarding** (questionnaire) → **Upload** → **Gap Reveal** → **Dashboard** → **Chat**.  
3. **Dashboard:** scores, insights (with citation pills), 90-day plan, narrative, disclaimer.  
4. **Chat:** message list, input, send profile + message to `POST /chat`, show reply and source pills.  
5. **Citation pills** everywhere you show `Source[]`; use `BADGE_LABELS` and `BADGE_COLORS`.  
6. Integrate with backend (profile) and AI service (strategy, chat) when ready; use mocks until then.

If anything is unclear, ask for the exact field names or example JSON from `shared/schemas` and `shared/mock`.
