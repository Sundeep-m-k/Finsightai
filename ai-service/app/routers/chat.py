"""POST /chat — conversational follow-up with profile context and citations."""
from __future__ import annotations

import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.clients.finnhub_client import get_quote
from app.clients.llm_client import complete
from app.config import settings
from app.rag.retriever import retrieve
from app.schemas.profile import ChatRequest, UserProfile
from app.schemas.sources import Source
from app.services.citation_formatter import chunks_to_sources

router = APIRouter()

ALLOWED_TICKERS = settings.allowed_tickers


def _tickers_mentioned(text: str) -> list[str]:
    """Return allowed tickers that appear in the message (word-boundary, case-insensitive)."""
    text_upper = text.upper()
    found = []
    for symbol in ALLOWED_TICKERS:
        if re.search(rf"\b{re.escape(symbol)}\b", text_upper):
            found.append(symbol)
    return list(dict.fromkeys(found))  # preserve order, no dupes


def _fetch_live_quotes(symbols: list[str]) -> tuple[str, list[Source]]:
    """Fetch quotes for symbols. Returns (formatted text for prompt, list of Market sources)."""
    lines = []
    market_sources: list[Source] = []
    for symbol in symbols:
        data = get_quote(symbol)
        if data:
            price = data["price"]
            ch = data.get("change_pct")
            line = f"{symbol}: ${price:.2f}" + (f" ({ch:+.2f}% today)" if ch is not None else "")
            lines.append(line)
            market_sources.append(
                Source(
                    title=f"Live quote: {symbol}",
                    url="https://finnhub.io",
                    preview=f"{symbol} ${price:.2f} (real-time)",
                    relevance_score=1.0,
                    badge_type="market",
                )
            )
    if not lines:
        return "No live quotes available (API key may be missing or rate limited).", []
    return "\n".join(lines), market_sources

# In-memory: session_id -> { "profile": UserProfile, "messages": [{"role","content"}] }
_sessions: dict[str, dict[str, Any]] = {}

PROMPT_DIR = __file__.replace("routers/chat.py", "prompts")


def _get_or_create_session(session_id: str | None, profile: UserProfile) -> str:
    sid = session_id or str(uuid.uuid4())
    if sid not in _sessions:
        _sessions[sid] = {"profile": profile, "messages": []}
    else:
        _sessions[sid]["profile"] = profile  # allow updating profile
    return sid


def _profile_summary(profile: UserProfile) -> str:
    q = profile.questionnaire
    b = profile.behavioral
    return (
        f"Income ${q.income_monthly or 0:.0f}/mo, expenses ${q.expenses_monthly or 0:.0f}/mo. "
        f"Goal: {q.primary_goal}. Flags: {', '.join(b.flags) or 'none'}. "
        f"Saving readiness {profile.saving_readiness_score}/10, investment {profile.investment_readiness_score}/10."
    )


@router.post("")
def post_chat(body: ChatRequest) -> dict[str, Any]:
    message = body.message
    profile = body.profile
    sid = _get_or_create_session(body.session_id, profile)
    sess = _sessions[sid]
    sess["messages"].append({"role": "user", "content": message})

    # Live quote lookup if user asked about a ticker (VOO, QQQ, BND, SPY, SCHD)
    tickers = _tickers_mentioned(message)
    live_quotes_text, market_sources = _fetch_live_quotes(tickers) if tickers else ("", [])

    # Query-driven retrieval
    chunks = retrieve(query=message, topic_filter=None, k=3)
    from pathlib import Path
    prompt_dir = Path(__file__).resolve().parent.parent / "prompts"
    system_path = prompt_dir / "system_prompt.txt"
    chat_path = prompt_dir / "chat_prompt.txt"
    system = system_path.read_text(encoding="utf-8")
    tpl = chat_path.read_text(encoding="utf-8")

    profile_summary = _profile_summary(profile)
    rag_block = "\n\n".join(
        f"[{c.source_title}] {c.content[:400]}..." if len(c.content) > 400 else f"[{c.source_title}] {c.content}"
        for c in chunks
    )
    conv = []
    for m in sess["messages"][-10:]:
        conv.append(f"{m['role'].upper()}: {m['content']}")
    conversation = "\n".join(conv)
    user_content = tpl.format(
        PROFILE_SUMMARY=profile_summary,
        LIVE_QUOTES=live_quotes_text or "None.",
        RAG_CHUNKS=rag_block,
        CONVERSATION=conversation,
        USER_MESSAGE=message,
    )

    try:
        reply = complete(system=system, user=user_content, max_tokens=1024)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    sess["messages"].append({"role": "assistant", "content": reply})
    sources: list[Source] = chunks_to_sources(chunks)
    sources = sources + market_sources

    return {"message": reply, "sources": [s.model_dump() for s in sources], "session_id": sid}
