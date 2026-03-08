from __future__ import annotations

import os
from uuid import uuid4
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

from live_stocks import latest_quotes, subscribers, start_stream_in_background, get_connection_status
from models import (
    BehavioralProfile,
    CategoryAggregate,
    QuestionnaireInput,
    ReadinessReport,
)
from parser import parse_and_aggregate
from scorer import compute_readiness_report
from session_store import get_session, save_session, update_session
from signals import compute_behavioral_profile


app = FastAPI(title="FinSight AI Backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Start Finnhub WebSocket stream on app startup."""
    start_stream_in_background()

# ─── Frontend-compatible Pydantic models ───────────────────────────────────────

class FrontendQuestionnaire(BaseModel):
    income_monthly: Optional[float] = None
    expenses_monthly: Optional[float] = None
    loan_balance: Optional[float] = None
    loan_rate: Optional[float] = None
    credit_card_balance: Optional[float] = None
    cc_limit: Optional[float] = None
    primary_goal: str = "investing"          # debt_payoff | emergency_fund | investing | budgeting
    risk_tolerance: Optional[str] = None     # low | medium | high
    months_until_graduation: Optional[int] = None
    income_type: Optional[str] = None        # fixed | part_time | freelance | stipend
    time_horizon: Optional[str] = None       # lt_1yr | 1_3yr | 3_5yr | 5plus

class FrontendOnboardRequest(BaseModel):
    questionnaire: FrontendQuestionnaire

# ─── Mapping helpers ───────────────────────────────────────────────────────────

# Internal flag → frontend BehavioralFlag enum value
_FLAG_MAP: dict[str, str] = {
    "cc_utilization_rising":  "high_credit_utilization",
    "surplus_not_saved":      "spending_gap",
    "emergency_fund_critical":"no_emergency_fund",
    "high_debt_to_income":    "high_debt_burden",
    "surplus_volatile":       "irregular_income",
    "negative_balance_months":"high_debt_burden",
    "subscription_creep":     "lifestyle_creep",
    "dining_overspend":       "lifestyle_creep",
}

_GOAL_TO_INTERNAL: dict[str, str] = {
    "debt_payoff":    "pay_debt",
    "emergency_fund": "emergency_fund",
    "investing":      "start_investing",
    "budgeting":      "save_for_goal",
}
_GOAL_TO_FRONTEND: dict[str, str] = {v: k for k, v in _GOAL_TO_INTERNAL.items()}

_RISK_TO_COMFORT: dict[str, int] = {"low": 2, "medium": 3, "high": 4}
_COMFORT_TO_RISK: dict[int, str] = {1: "low", 2: "low", 3: "medium", 4: "high", 5: "high"}

# Frontend sends 'fixed' | 'part_time' | 'freelance' | 'stipend'
# Backend QuestionnaireInput expects 'stable' | 'part_time' | 'freelance' | 'stipend'
_INCOME_TYPE_TO_INTERNAL: dict[str, str] = {
    "fixed":     "stable",
    "part_time": "part_time",
    "freelance": "freelance",
    "stipend":   "stipend",
}
_INCOME_TYPE_TO_FRONTEND: dict[str, str] = {v: k for k, v in _INCOME_TYPE_TO_INTERNAL.items()}

# Frontend sends 'lt_1yr' | '1_3yr' | '3_5yr' | '5plus'
# Backend QuestionnaireInput expects 'under_1yr' | '1_3yr' | '3_5yr' | '5plus_yr'
_TIME_HORIZON_TO_INTERNAL: dict[str, str] = {
    "lt_1yr": "under_1yr",
    "1_3yr":  "1_3yr",
    "3_5yr":  "3_5yr",
    "5plus":  "5plus_yr",
}
_TIME_HORIZON_TO_FRONTEND: dict[str, str] = {v: k for k, v in _TIME_HORIZON_TO_INTERNAL.items()}


def _frontend_q_to_internal(q: FrontendQuestionnaire) -> QuestionnaireInput:
    return QuestionnaireInput(
        monthly_income=q.income_monthly or 0,
        fixed_expenses=q.expenses_monthly or 0,
        student_loan_balance=q.loan_balance or 0,
        student_loan_rate=q.loan_rate or 0,
        credit_card_balance=q.credit_card_balance or 0,
        credit_card_limit=q.cc_limit or 0,
        goal=_GOAL_TO_INTERNAL.get(q.primary_goal, "save_for_goal"),
        risk_comfort=_RISK_TO_COMFORT.get(q.risk_tolerance or "medium", 3),
        time_horizon=_TIME_HORIZON_TO_INTERNAL.get(q.time_horizon or "3_5yr", "3_5yr"),
        income_type=_INCOME_TYPE_TO_INTERNAL.get(q.income_type or "fixed", "stable"),
    )


def _internal_q_to_frontend(q: QuestionnaireInput) -> dict:
    return {
        "income_monthly": q.monthly_income,
        "expenses_monthly": q.fixed_expenses,
        "loan_balance": q.student_loan_balance,
        "loan_rate": q.student_loan_rate,
        "credit_card_balance": q.credit_card_balance,
        "cc_limit": q.credit_card_limit,
        "primary_goal": _GOAL_TO_FRONTEND.get(q.goal, "budgeting"),
        "risk_tolerance": _COMFORT_TO_RISK.get(q.risk_comfort, "medium"),
        "months_until_graduation": None,
        "income_type": _INCOME_TYPE_TO_FRONTEND.get(q.income_type, "fixed"),
        "time_horizon": _TIME_HORIZON_TO_FRONTEND.get(q.time_horizon, "3_5yr"),
    }


def _behavioral_to_frontend(b: BehavioralProfile) -> dict:
    gap = round(b.savings_rate_stated - b.savings_rate_actual, 2)
    mapped_flags = list(dict.fromkeys(
        _FLAG_MAP[f] for f in b.behavioral_flags if f in _FLAG_MAP
    ))
    expense_categories = [c for c in b.category_aggregates if c.category != "income"]
    total_spending = sum(c.monthly_avg for c in expense_categories)
    return {
        "flags": mapped_flags,
        "avg_monthly_spending": round(total_spending, 2),
        "savings_rate_pct": b.savings_rate_actual,
        "said_vs_actual_gap_pct": gap,
        "expense_breakdown": [
            {
                "category": c.category,
                "amount": round(c.monthly_avg, 2),
                "percentage": round(c.monthly_avg / total_spending * 100, 1) if total_spending > 0 else 0.0,
            }
            for c in expense_categories
        ],
    }


def _build_frontend_profile(
    questionnaire: QuestionnaireInput,
    behavioral: BehavioralProfile,
    readiness: ReadinessReport,
) -> dict:
    return {
        "questionnaire": _internal_q_to_frontend(questionnaire),
        "behavioral": _behavioral_to_frontend(behavioral),
        "saving_readiness_score": readiness.saving_score,
        "investment_readiness_score": readiness.investment_score,
        "analysis_period_months": behavioral.months_analyzed,
        "gap_analysis": [item.model_dump() for item in readiness.gap_analysis],
        "readiness_narrative": readiness.readiness_narrative,
        "investment_narrative": readiness.investment_narrative,
    }


# ─── Sample transactions for demo ─────────────────────────────────────────────

SAMPLE_CSV = b"""date,description,amount
2024-01-03,Rent payment,-950.00
2024-01-05,Grocery store,-87.50
2024-01-07,Uber,-12.40
2024-01-08,Netflix,-15.99
2024-01-10,Restaurant dining,-64.30
2024-01-12,Coffee shop,-8.75
2024-01-14,Gas station,-45.00
2024-01-15,Salary deposit,1800.00
2024-01-18,Fast food,-22.80
2024-01-20,Online shopping,-134.99
2024-01-22,Gym membership,-29.99
2024-01-25,Spotify,-9.99
2024-01-28,Restaurant dining,-78.50
2024-02-03,Rent payment,-950.00
2024-02-05,Grocery store,-94.20
2024-02-07,Uber,-18.60
2024-02-08,Netflix,-15.99
2024-02-10,Restaurant dining,-89.40
2024-02-12,Coffee shop,-12.50
2024-02-14,Gas station,-52.00
2024-02-15,Salary deposit,1800.00
2024-02-18,Fast food,-34.20
2024-02-20,Clothing store,-89.99
2024-02-22,Gym membership,-29.99
2024-02-25,Spotify,-9.99
2024-02-28,Restaurant dining,-56.80
2024-03-03,Rent payment,-950.00
2024-03-05,Grocery store,-103.40
2024-03-07,Uber,-9.80
2024-03-10,Restaurant dining,-112.60
2024-03-12,Coffee shop,-15.25
2024-03-14,Gas station,-38.00
2024-03-15,Salary deposit,1800.00
2024-03-18,Fast food,-28.90
2024-03-22,Gym membership,-29.99
2024-03-25,Spotify,-9.99
2024-03-28,Restaurant dining,-67.30
"""


# ─── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "FinSight AI backend is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


# ── Onboarding ─────────────────────────────────────────────────────────────────

@app.post("/onboard")
def onboard(body: FrontendOnboardRequest) -> dict[str, str]:
    """Accept frontend QuestionnaireSummary format and create session."""
    internal_q = _frontend_q_to_internal(body.questionnaire)
    session_id = str(uuid4())
    save_session(session_id, {
        "session_id": session_id,
        "questionnaire": internal_q.model_dump(),
    })
    return {"session_id": session_id, "message": "Questionnaire saved."}


@app.get("/onboard")
def get_onboard(session_id: str = Query(...)) -> dict:
    """Return the saved questionnaire in frontend format."""
    session = get_session(session_id)
    if not session or "questionnaire" not in session:
        raise HTTPException(status_code=404, detail="Session or questionnaire not found.")
    q = QuestionnaireInput(**session["questionnaire"])
    return {"questionnaire": _internal_q_to_frontend(q)}


# ── Upload ─────────────────────────────────────────────────────────────────────

async def _process_upload(session_id: str, file_bytes: bytes, filename: str) -> dict:
    """Shared logic: parse → behavioural → score → return frontend profile."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if "questionnaire" not in session:
        raise HTTPException(status_code=400, detail="Complete questionnaire first.")

    try:
        parsed = parse_and_aggregate(file_bytes=file_bytes, filename=filename)
        questionnaire = QuestionnaireInput(**session["questionnaire"])
        category_aggregates = [
            item if isinstance(item, CategoryAggregate) else CategoryAggregate(**item)
            for item in parsed["category_aggregates"]
        ]
        behavioral = compute_behavioral_profile(
            questionnaire=questionnaire,
            category_aggregates=category_aggregates,
            months_analyzed=parsed["months_analyzed"],
        )
        readiness = compute_readiness_report(
            questionnaire=questionnaire,
            behavioral=behavioral,
        )
        update_session(session_id, "behavioral", behavioral.model_dump())
        update_session(session_id, "transactions", parsed["transactions"])
        update_session(session_id, "readiness", readiness.model_dump())
        update_session(session_id, "audit", parsed.get("audit", {}))

        return {
            "session_id": session_id,
            "transactions_count": len(parsed.get("transactions", [])),
            "profile": _build_frontend_profile(questionnaire, behavioral, readiness),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {exc}") from exc


@app.post("/upload")
async def upload_transactions(
    session_id: str = Query(...),
    file: UploadFile = File(...),
) -> dict:
    """Upload CSV/Excel; returns frontend-compatible UserProfile."""
    file_bytes = await file.read()
    return await _process_upload(session_id, file_bytes, file.filename or "")


@app.post("/upload/sample")
async def upload_sample(session_id: str = Query(...)) -> dict:
    """Use built-in sample data; returns frontend-compatible UserProfile."""
    return await _process_upload(session_id, SAMPLE_CSV, "sample.csv")


# ── Profile ────────────────────────────────────────────────────────────────────

@app.get("/profile")
def get_profile(session_id: str = Query(...)) -> dict:
    """Return full profile in frontend-compatible format."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    for key in ("questionnaire", "behavioral", "readiness"):
        if key not in session:
            raise HTTPException(status_code=400, detail=f"{key.capitalize()} missing from session.")
    try:
        q = QuestionnaireInput(**session["questionnaire"])
        b = BehavioralProfile(**session["behavioral"])
        r = ReadinessReport(**session["readiness"])
        return _build_frontend_profile(q, b, r)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to build profile: {exc}") from exc


# ── Legacy score endpoint ──────────────────────────────────────────────────────

@app.post("/score/{session_id}", response_model=ReadinessReport)
def score_session(session_id: str) -> ReadinessReport:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if "questionnaire" not in session:
        raise HTTPException(status_code=400, detail="Questionnaire missing.")
    if "behavioral" not in session:
        raise HTTPException(status_code=400, detail="Upload transactions first.")
    try:
        q = QuestionnaireInput(**session["questionnaire"])
        b = BehavioralProfile(**session["behavioral"])
        readiness = compute_readiness_report(questionnaire=q, behavioral=b)
        update_session(session_id, "readiness", readiness.model_dump())
        return readiness
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute score: {exc}") from exc


# ── Debug endpoints (backend validation only) ──────────────────────────────────

@app.get("/debug/upload-preview/{session_id}")
def debug_upload_preview(session_id: str) -> dict:
    """Inspect what was parsed from uploaded file."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if "transactions" not in session:
        raise HTTPException(status_code=400, detail="No transactions parsed yet.")
    
    audit = session.get("audit", {})
    transactions = session.get("transactions", [])
    
    # Return first 20 transactions + audit summary
    return {
        "sheets_info": {
            "total_scanned": audit.get("total_sheets_scanned", 0),
            "accepted": audit.get("sheets_accepted", []),
            "skipped": audit.get("sheets_skipped", []),
        },
        "parsing_quality": {
            "rows_extracted": audit.get("rows_extracted", 0),
            "rows_dropped": audit.get("rows_dropped", 0),
            "warnings": audit.get("parse_warnings", []),
        },
        "sample_transactions": transactions[:20],
        "transaction_count": len(transactions),
    }


@app.get("/debug/monthly-summary/{session_id}")
def debug_monthly_summary(session_id: str) -> dict:
    """Return month-wise income, expenses, and categories."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if "transactions" not in session:
        raise HTTPException(status_code=400, detail="No transactions parsed yet.")
    
    transactions = session.get("transactions", [])
    behavioral = session.get("behavioral", {})
    audit = session.get("audit", {})
    
    # Group by month
    monthly_summary: dict[str, dict] = {}
    for tx in transactions:
        month = tx.get("month", "unknown")
        if month not in monthly_summary:
            monthly_summary[month] = {
                "income": 0.0,
                "expenses": 0.0,
                "categories": {},
            }
        
        amount = tx.get("amount", 0)
        category = tx.get("category", "other")
        
        if category == "income":
            monthly_summary[month]["income"] += abs(amount)
        else:
            monthly_summary[month]["expenses"] += abs(amount)
        
        if category not in monthly_summary[month]["categories"]:
            monthly_summary[month]["categories"][category] = 0.0
        monthly_summary[month]["categories"][category] += abs(amount)
    
    return {
        "detected_months": audit.get("detected_months", []),
        "monthly_totals": monthly_summary,
        "monthly_count": len(monthly_summary),
        "average_monthly_income": (
            behavioral.get("questionnaire", {}).get("income_monthly", 0)
            if isinstance(behavioral, dict)
            else 0
        ),
        "average_monthly_expenses": behavioral.get("avg_monthly_spending", 0),
    }


@app.get("/debug/parser-audit/{session_id}")
def debug_parser_audit(session_id: str) -> dict:
    """Return detailed parser audit trail."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if "audit" not in session:
        raise HTTPException(status_code=400, detail="No parsing audit available.")
    
    audit = session.get("audit", {})
    transactions = session.get("transactions", [])
    
    # Calculate some quality metrics
    quality_score = 100
    warnings = audit.get("parse_warnings", [])
    
    if audit.get("rows_dropped", 0) > audit.get("rows_extracted", 0) * 0.2:
        quality_score -= 10
    
    if any("inference" in w.lower() for w in warnings):
        quality_score -= 5
    
    if audit.get("sheets_skipped"):
        quality_score -= 5
    
    return {
        "parser_audit": audit,
        "quality_score": max(0, quality_score),
        "quality_notes": [
            "✓ Date parsing successful" if not any("inference" in w for w in warnings) else "⚠ Date parsing used inference",
            f"✓ Extracted {audit.get('rows_extracted', 0)} valid rows" if audit.get('rows_extracted', 0) > 0 else "✗ No rows extracted",
            f"✓ No rows dropped" if audit.get('rows_dropped', 0) == 0 else f"⚠ Dropped {audit.get('rows_dropped', 0)} rows",
            f"✓ All sheets accepted" if not audit.get('sheets_skipped') else f"⚠ Skipped {len(audit.get('sheets_skipped', []))} sheets",
        ],
        "sheets_info": {
            "total_scanned": audit.get("total_sheets_scanned", 0),
            "accepted": audit.get("sheets_accepted", []),
            "skipped": audit.get("sheets_skipped", []),
        },
        "transaction_sample": transactions[:5] if transactions else [],
    }


# ── Live Stock Market Data ──────────────────────────────────────────────────────

@app.get("/live/watchlist")
def get_watchlist_snapshot() -> dict:
    """
    GET live stock watchlist snapshot.
    Returns latest quotes for VTI, VOO, SPY.
    Can be called without requiring authentication.
    Watchlist always available—not gated behind readiness.
    """
    return {
        "quotes": latest_quotes,
        "symbols": ["VTI", "VOO", "SPY"],
        "status": "live" if latest_quotes else ("connected" if get_connection_status() else "streaming_disconnected"),
    }


@app.websocket("/ws/live-stocks")
async def websocket_live_stocks(websocket: WebSocket):
    """
    WebSocket endpoint for live stock price updates.
    Frontend subscribes once; receives broadcast of all quote updates.
    """
    await websocket.accept()

    async def send_json(payload: dict):
        """Send JSON to this WebSocket client."""
        try:
            await websocket.send_json(payload)
        except Exception:
            pass

    # Add this send function to subscribers
    subscribers.add(send_json)

    try:
        # Send initial snapshot on connect
        await websocket.send_json({
            "type": "live_quotes",
            "quotes": latest_quotes,
        })
        # Keep connection open; messages will be broadcast by live_stocks module
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        subscribers.discard(send_json)
