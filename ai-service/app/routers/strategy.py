"""POST /strategy — personalized financial strategy from profile."""
from fastapi import APIRouter, HTTPException

from app.schemas.insight import InsightResponse
from app.schemas.profile import UserProfile
from app.services.strategy_engine import run

router = APIRouter()


@router.post("", response_model=InsightResponse)
def post_strategy(profile: UserProfile) -> InsightResponse:
    try:
        return run(profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
