"""GET /market/quote?symbol=VOO — live quote for allowed tickers."""
from fastapi import APIRouter, HTTPException

from app.clients.finnhub_client import get_quote
from app.config import settings
from app.schemas.market import QuoteResponse
from datetime import datetime, timezone

router = APIRouter()


@router.get("/quote", response_model=QuoteResponse)
def get_market_quote(symbol: str) -> QuoteResponse:
    symbol = symbol.upper()
    if symbol not in settings.allowed_tickers:
        raise HTTPException(status_code=400, detail=f"Symbol not allowed. Use one of: {sorted(settings.allowed_tickers)}")
    data = get_quote(symbol)
    if not data:
        raise HTTPException(status_code=502, detail="Quote unavailable (check API key or rate limit)")
    return QuoteResponse(
        symbol=data["symbol"],
        price=data["price"],
        change_pct=data.get("change_pct"),
        updated_at=datetime.now(tz=timezone.utc).isoformat(),
    )
