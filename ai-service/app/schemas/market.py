"""Market quote and macro types."""
from pydantic import BaseModel


class QuoteResponse(BaseModel):
    symbol: str
    price: float
    change_pct: float | None = None
    updated_at: str
