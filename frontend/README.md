# FinSight AI Frontend (Person 1)

React + Vite + TypeScript + Tailwind. Uses shared types and mocks; talks to ai-service for strategy and chat.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173. Flow: Landing → Onboarding → Upload → Gap Reveal → Dashboard → Chat.

## Env

- `VITE_AI_SERVICE_URL` — AI service base URL (default `http://localhost:8001`). Set to your ai-service URL in production.
- `VITE_USE_MOCK` — Set to `true` to use mock strategy/chat (no AI service required). Omit or `false` to call the real API.

## Build

```bash
npm run build
```

Output in `dist/`. Serve with any static host or `npm run preview`.
