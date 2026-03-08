"""Onboarding: submit questionnaire, create or update session."""
from fastapi import APIRouter, HTTPException

from app.models import OnboardRequest, QuestionnaireSummary, UserProfile
from app.storage.session_store import ensure_session, get_session, set_questionnaire

router = APIRouter()


@router.post("/onboard")
def onboard(body: OnboardRequest, session_id: str | None = None):
    """
    Submit questionnaire. Creates a new session if session_id not provided.
    Returns session_id for use in upload and profile.
    """
    sid = ensure_session(session_id)
    set_questionnaire(sid, body.questionnaire)
    return {"session_id": sid, "message": "Questionnaire saved."}


@router.get("/onboard")
def get_onboard(session_id: str):
    """Get saved questionnaire for a session (optional)."""
    data = get_session(session_id)
    if not data or not data.questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    return {"questionnaire": data.questionnaire}
