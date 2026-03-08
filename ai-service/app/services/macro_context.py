"""Macro context for strategy prompt. Cached 30 min. Stubbed if no API key."""
from __future__ import annotations

import time
from pathlib import Path

from app.config import settings

_CACHE: dict[str, tuple[str, float]] = {}
_TTL_SEC = settings.macro_cache_ttl_minutes * 60


def get_macro_context() -> str:
    key = "macro"
    now = time.time()
    if key in _CACHE:
        val, ts = _CACHE[key]
        if now - ts < _TTL_SEC:
            return val
    text = _fetch_macro()
    _CACHE[key] = (text, now)
    return text


def _fetch_macro() -> str:
    if not settings.finnhub_api_key:
        return (
            "Macro context: use general principles. "
            "When rates are high, emphasize high-yield savings; when volatile, emphasize diversified index funds."
        )
    # Optional: call Finnhub or another API for fed rate, CPI, etc.
    return (
        "Macro context: use general principles. "
        "When rates are high, emphasize high-yield savings; when volatile, emphasize diversified index funds."
    )
