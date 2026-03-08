"""Upload transactions CSV/Excel; parse, categorize, compute signals and profile."""
from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.models import Transaction, UserProfile
from app.services.categorizer import categorize_transactions
from app.services.parser import parse_upload
from app.services.signals import compute_behavioral
from app.services.scorer import build_profile
from app.storage.session_store import ensure_session, get_session, set_transactions, set_profile

router = APIRouter()


@router.post("/upload")
async def upload(
    file: UploadFile | None = File(None),
    session_id: str | None = Query(None),
):
    """
    Upload a CSV or Excel file of transactions, or skip (use sample). Requires session_id from /onboard.
    Parses, categorizes, computes behavioral profile and readiness scores, stores profile.
    """
    sid = ensure_session(session_id)
    data = get_session(sid)
    if not data or not data.questionnaire:
        raise HTTPException(
            status_code=400,
            detail="Complete onboarding first (POST /onboard with questionnaire).",
        )

    if file and file.filename:
        content = await file.read()
        content_type = file.content_type or ""
        transactions = parse_upload(content, content_type, file.filename)
        transactions = categorize_transactions(transactions)
    else:
        # No file: use minimal placeholder so we still build a profile from questionnaire
        transactions = []

    set_transactions(sid, transactions)

    behavioral = compute_behavioral(transactions, data.questionnaire)
    n_months = 1
    if transactions:
        months = set(t.date[:7] for t in transactions if len(t.date) >= 7)
        n_months = len(months) or 1
    profile = build_profile(data.questionnaire, behavioral, analysis_period_months=n_months)
    set_profile(sid, profile)

    return {
        "session_id": sid,
        "transactions_count": len(transactions),
        "profile": profile.model_dump(),
    }


@router.post("/upload/sample")
def upload_sample(session_id: str | None = Query(None)):
    """
    Load sample transactions and compute profile (no file). Uses built-in sample rows.
    """
    sid = ensure_session(session_id)
    data = get_session(sid)
    if not data or not data.questionnaire:
        raise HTTPException(status_code=400, detail="Complete onboarding first.")

    # Minimal sample so behavioral has something
    sample = [
        Transaction(date="2024-01-15", amount=-520, description="Groceries", category="Food"),
        Transaction(date="2024-01-20", amount=-800, description="Rent", category="Rent"),
        Transaction(date="2024-01-25", amount=-180, description="Gas", category="Transport"),
        Transaction(date="2024-01-01", amount=2400, description="Paycheck", category="Income"),
        Transaction(date="2024-02-01", amount=2400, description="Paycheck", category="Income"),
        Transaction(date="2024-02-10", amount=-500, description="Food", category="Food"),
        Transaction(date="2024-02-15", amount=-800, description="Rent", category="Rent"),
    ]
    sample = categorize_transactions(sample)
    set_transactions(sid, sample)

    behavioral = compute_behavioral(sample, data.questionnaire)
    profile = build_profile(data.questionnaire, behavioral, analysis_period_months=2)
    set_profile(sid, profile)

    return {"session_id": sid, "transactions_count": len(sample), "profile": profile.model_dump()}
