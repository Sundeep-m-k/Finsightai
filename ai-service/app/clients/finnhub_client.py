"""Finnhub quote and optional macro. Free tier sufficient for demo."""
from __future__ import annotations

import os
from typing import Any

import httpx

from app.config import settings

BASE = "https://finnhub.io/api/v1"
ALLOWED = settings.allowed_tickers


def get_quote(symbol: str) -> dict[str, Any] | None:
    symbol = symbol.upper()
    if symbol not in ALLOWED:
        return None
    key = settings.finnhub_api_key or os.environ.get("FINNHUB_API_KEY")
    if not key:
        return None
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(f"{BASE}/quote", params={"symbol": symbol, "token": key})
            r.raise_for_status()
            data = r.json()
            c = data.get("c")  # current
            pc = data.get("pc")  # previous close
            if c is None:
                return None
            change_pct = ((c - pc) / pc * 100) if pc else None
            return {
                "symbol": symbol,
                "price": float(c),
                "change_pct": round(change_pct, 2) if change_pct is not None else None,
            }
    except Exception:
        return None
