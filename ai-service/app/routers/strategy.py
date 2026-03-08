"""POST /strategy — personalized financial strategy from profile."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.insight import InsightResponse
from app.schemas.profile import UserProfile
from app.services.strategy_engine import run

router = APIRouter()


class StrategyRequest(BaseModel):
    """Request body: { "profile": UserProfile } — matches shared/schemas/api-types.ts."""
    profile: UserProfile


@router.post("", response_model=InsightResponse)
def post_strategy(body: StrategyRequest) -> InsightResponse:
    try:
        return run(body.profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
