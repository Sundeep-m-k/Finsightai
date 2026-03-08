#!/usr/bin/env bash
# Test full flow locally: backend (8000), AI service (8001). Run from repo root.
# Start backend and ai-service in two separate terminals first, then run this script.

set -e
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
AI_URL="${AI_URL:-http://127.0.0.1:8001}"

echo "=== 1. Health checks ==="
curl -sf "$BACKEND_URL/health" && echo " Backend OK" || { echo "Backend not responding at $BACKEND_URL"; exit 1; }
curl -sf "$AI_URL/health" && echo " AI service OK" || { echo "AI service not responding at $AI_URL"; exit 1; }

echo ""
echo "=== 2. Onboard (questionnaire) ==="
ONBOARD_RESP=$(curl -sf -X POST "$BACKEND_URL/onboard" \
  -H "Content-Type: application/json" \
  -d '{"questionnaire":{"income_monthly":2400,"expenses_monthly":2100,"primary_goal":"investing","risk_tolerance":"medium"}}')
SESSION_ID=$(echo "$ONBOARD_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['session_id'])")
echo "Session ID: $SESSION_ID"

echo ""
echo "=== 3. Upload sample ==="
UPLOAD_RESP=$(curl -sf -X POST "$BACKEND_URL/upload/sample?session_id=$SESSION_ID")
echo "$UPLOAD_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Transactions:', d.get('transactions_count'))
p = d.get('profile', {})
print('Saving readiness:', p.get('saving_readiness_score'), '| Investment readiness:', p.get('investment_readiness_score'))
"

echo ""
echo "=== 4. Get profile ==="
PROFILE=$(curl -sf "$BACKEND_URL/profile?session_id=$SESSION_ID")
echo "Profile keys: $(echo "$PROFILE" | python3 -c "import sys,json; print(list(json.load(sys.stdin).keys()))")"

echo ""
echo "=== 5. Strategy (AI service) ==="
STRATEGY_RESP=$(curl -sf -X POST "$AI_URL/strategy" \
  -H "Content-Type: application/json" \
  -d "{\"profile\": $PROFILE}" 2>/dev/null) || true
if echo "$STRATEGY_RESP" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  echo "$STRATEGY_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Insights:', len(d.get('insights', [])))
print('Action plan steps:', len(d.get('action_plan', [])))
print('Narrative length:', len(d.get('narrative', '')))
"
else
  echo "Strategy call failed (check ANTHROPIC_API_KEY and RAG index). Response snippet: ${STRATEGY_RESP:0:200}"
fi

echo ""
echo "=== Done. Frontend: cd frontend && npm run dev, then open http://localhost:5173 ==="
