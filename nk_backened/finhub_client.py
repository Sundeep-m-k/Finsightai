import os
from datetime import date, timedelta
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
BASE_URL = "https://finnhub.io/api/v1"


def _get(path: str, params: dict[str, Any]) -> dict[str, Any] | list[Any]:
    if not FINNHUB_API_KEY:
        return {"warning": "FINNHUB_API_KEY not set"}

    response = requests.get(
        f"{BASE_URL}/{path}",
        params={**params, "token": FINNHUB_API_KEY},
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def get_quote(symbol: str) -> dict[str, Any]:
    return _get("quote", {"symbol": symbol})


def get_profile2(symbol: str) -> dict[str, Any]:
    return _get("stock/profile2", {"symbol": symbol})


def get_recommendation_trends(symbol: str) -> list[dict[str, Any]]:
    return _get("stock/recommendation", {"symbol": symbol})


def get_market_status(exchange: str = "US") -> dict[str, Any]:
    return _get("stock/market-status", {"exchange": exchange})


def get_company_news(symbol: str, days_back: int = 14) -> list[dict[str, Any]]:
    today = date.today()
    start = today - timedelta(days=days_back)
    return _get(
        "company-news",
        {
            "symbol": symbol,
            "from": start.isoformat(),
            "to": today.isoformat(),
        },
    )


def get_symbol_snapshot(symbol: str) -> dict[str, Any]:
    return {
        "symbol": symbol,
        "quote": get_quote(symbol),
        "profile": get_profile2(symbol),
        "recommendation_trends": get_recommendation_trends(symbol),
        "news": get_company_news(symbol, days_back=10),
    }


def get_investment_market_context(symbols: list[str]) -> dict[str, Any]:
    return {
        "market_status": get_market_status("US"),
        "symbols": {symbol: get_symbol_snapshot(symbol) for symbol in symbols},
    }