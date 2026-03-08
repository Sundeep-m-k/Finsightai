"""Get profile for a session."""
from fastapi import APIRouter, HTTPException

from app.storage.session_store import get_session

router = APIRouter()


@router.get("/profile")
def get_profile(session_id: str):
    """
    Return full UserProfile for the session. Must have completed onboard + upload (or upload/sample).
    """
    data = get_session(session_id)
    if not data:
        raise HTTPException(status_code=404, detail="Session not found")
    if not data.profile:
        raise HTTPException(
            status_code=400,
            detail="Profile not ready. Complete onboarding and upload first.",
        )
    return data.profile.model_dump()
