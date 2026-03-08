"""POST /chat — conversational follow-up with profile context and citations."""
from __future__ import annotations

import asyncio
import json
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.clients.finnhub_client import get_quote
from app.clients.llm_client import complete
from app.config import settings
from app.rag.retriever import retrieve
from app.rag.web_retrieval import search_web_for_concept, should_use_web_retrieval
from app.schemas.profile import ChatRequest, UserProfile
from app.schemas.sources import Source
from app.services.citation_formatter import chunks_to_sources
from app.services.strategy_engine import build_plan_outcomes

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
_MAX_SESSIONS = 500

from pathlib import Path as _Path
_PROMPT_DIR = _Path(__file__).resolve().parent.parent / "prompts"
_SYSTEM_PROMPT = (_PROMPT_DIR / "system_prompt.txt").read_text(encoding="utf-8")
_CHAT_PROMPT = (_PROMPT_DIR / "chat_prompt.txt").read_text(encoding="utf-8")
_QNA_PROMPT = (_PROMPT_DIR / "qna_prompt.txt").read_text(encoding="utf-8")


def _get_or_create_session(session_id: str | None, profile: UserProfile) -> str:
    sid = session_id or str(uuid.uuid4())
    if sid not in _sessions:
        if len(_sessions) >= _MAX_SESSIONS:
            _sessions.pop(next(iter(_sessions)))
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


def _question_type(message: str) -> str:
    m = message.lower()
    if any(k in m for k in ["build wealth", "wealth", "student income", "invest", "emergency fund"]):
        return "wealth_building"
    if any(k in m for k in ["debt", "credit card", "payoff"]):
        return "debt"
    if any(k in m for k in ["budget", "spending", "save more", "saving"]):
        return "budgeting"
    return "general"


def _targeted_query(message: str, qtype: str) -> str:
    if qtype == "wealth_building":
        return (
            "student wealth building emergency fund first beginner investing after savings stability "
            "low cost index fund savings consistency"
        )
    if qtype == "debt":
        return "student debt payoff credit card utilization debt avalanche debt snowball minimum payment risk"
    if qtype == "budgeting":
        return "student budgeting spending leaks savings automation pay-yourself-first cash flow stability"
    return message


def _plan_brief(profile: UserProfile, plan_outcomes: dict[str, Any], qtype: str) -> dict[str, Any]:
    income = float(profile.questionnaire.income_monthly or 0)
    expenses = float(profile.behavioral.avg_monthly_spending or profile.questionnaire.expenses_monthly or 0)
    surplus = round(income - expenses, 2)
    return {
        "question_type": qtype,
        "user_financial_position": {
            "income": income,
            "expenses": expenses,
            "surplus": surplus,
        },
        "current_readiness": {
            "saving_score": plan_outcomes.get("saving_score"),
            "investment_score": plan_outcomes.get("investment_score"),
            "readiness_status": plan_outcomes.get("readiness_status"),
        },
        "emergency_fund_targets": {
            "starter_target": plan_outcomes.get("starter_emergency_target"),
            "one_month_target": plan_outcomes.get("emergency_fund_1mo_target"),
            "three_month_target": plan_outcomes.get("emergency_fund_3mo_target"),
            "months_to_1mo": plan_outcomes.get("months_to_1mo_emergency_fund"),
            "months_to_3mo": plan_outcomes.get("months_to_3mo_emergency_fund"),
        },
        "main_blockers": plan_outcomes.get("primary_blockers", []),
        "recommended_focus": [
            "automate saving",
            "reduce overspending",
            "build emergency buffer",
        ],
        "investing_gate": (
            "delay regular investing until savings stability improves"
            if plan_outcomes.get("readiness_status") == "not_ready"
            else "start small automated investing while maintaining emergency savings progress"
        ),
        "plan_outcomes": plan_outcomes,
    }


def _deterministic_wealth_answer(profile: UserProfile, plan_outcomes: dict[str, Any]) -> str:
    income = float(profile.questionnaire.income_monthly or 0)
    expenses = float(profile.behavioral.avg_monthly_spending or profile.questionnaire.expenses_monthly or 0)
    surplus = round(income - expenses, 2)
    saving_score = plan_outcomes.get("saving_score", 0)
    investment_score = plan_outcomes.get("investment_score", 0)
    readiness_status = str(plan_outcomes.get("readiness_status", "not_ready"))
    blockers = plan_outcomes.get("primary_blockers", [])
    blocker_text = ", ".join(blockers[:3]) if blockers else "cash-flow inconsistency"
    next_steps = plan_outcomes.get("action_plan_90d", [])
    
    # Emergency fund targets (deterministic from backend)
    emergency_1mo = plan_outcomes.get("emergency_fund_1mo_target", 0)
    emergency_3mo = plan_outcomes.get("emergency_fund_3mo_target", 0)
    starter_emergency = plan_outcomes.get("starter_emergency_target", 0)

    lines: list[str] = []
    lines.append(
        "Building wealth on a student income starts with protecting monthly surplus, "
        "building emergency savings, and then scaling investing."
    )
    lines.append("")
    lines.append(
        f"Based on your current numbers: income is ${income:.0f}/month, expenses are ${expenses:.0f}/month, "
        f"and surplus is about ${surplus:.0f}/month."
    )
    lines.append(
        f"Current readiness: saving score {saving_score}/10, investment score {investment_score}/10."
    )
    lines.append(f"Your main blockers: {blocker_text}.")
    lines.append("")
    lines.append(
        f"Emergency fund targets: starter buffer ${starter_emergency:.0f}, "
        f"1-month cushion ${emergency_1mo:.0f}, "
        f"3-month cushion ${emergency_3mo:.0f}."
    )
    lines.append("")
    lines.append("Your next 3 steps are:")

    if next_steps:
        for idx, phase in enumerate(next_steps[:3], start=1):
            phase_actions = phase.get("actions", [])
            step_text = "; ".join(phase_actions[:2]) if phase_actions else "Follow your current action milestone"
            lines.append(f"{idx}. {step_text}.")
    else:
        lines.append("1. Automate monthly savings from payday.")
        lines.append("2. Reduce top overspend categories first.")
        lines.append("3. Build emergency savings before increasing investment risk.")

    lines.append("")
    if readiness_status == "not_ready":
        lines.append(
            "You’ll be ready to invest more confidently when savings stay consistent for multiple months, "
            "emergency buffer improves, and credit utilization drops."
        )
    elif readiness_status == "preparing":
        lines.append(
            "You’re in preparing mode: keep emergency-fund progress steady and start with small automated investing only."
        )
    else:
        lines.append(
            "You’re ready to build wealth with disciplined, automatic contributions while preserving your cash buffer."
        )

    return "\n".join(lines)

def _prioritize_chunks_for_qna(chunks: list[Any], max_items: int = 8) -> list[Any]:
    """
    For Q&A, prioritize: web sources (definitions) > PDFs > internal docs.
    This is opposite to plan generation, where internal rules dominate.
    """
    # Separate by badge type
    web = [c for c in chunks if c.badge_type in ("government", "academic") and "http" in c.source_url]
    pdfs = [c for c in chunks if c.badge_type == "academic" and "http" not in c.source_url]
    internal = [c for c in chunks if c.badge_type == "finsight-kb"]
    other = [c for c in chunks if c not in web + pdfs + internal]
    
    # Web-first ordering for concept questions
    return (web + pdfs + internal + other)[:max_items]


def _chunks_to_prompt_block(chunks: list[Any], max_content_chars: int = 800) -> str:
    if not chunks:
        return "(none)"
    return "\n\n---\n\n".join(
        f"Source: {c.source_title}\nURL: {c.source_url}\nContent: {str(c.content)[:max_content_chars]}"
        for c in chunks
    )


async def _answer_user_question(
    question: str,
    profile: UserProfile,
    plan_outcomes: dict[str, Any],
) -> tuple[str, list[Any]]:
    """
    Answer a user's finance question with web + PDF-backed definitions + personalized diagnosis.
    
    Returns: (answer_text, retrieved_chunks)
    """
    # Check if we should fetch web sources
    use_web = should_use_web_retrieval(question)
    print(f"[Q&A] User question: {question}")
    
    # Fetch local RAG sources
    local_chunks = retrieve(query=question, topic_filter=None, k=6)
    print(f"[Q&A] Local chunks ({len(local_chunks)}): {[c.source_title for c in local_chunks]}")
    
    # Fetch web sources if beneficial (async)
    web_chunks = []
    if use_web:
        print(f"[Q&A] Triggering web retrieval for concept question: {question[:80]}...")
        try:
            web_chunks = await search_web_for_concept(question, max_results=2)
            print(f"[Q&A] Web retrieval returned {len(web_chunks)} chunks")
            print(f"[Q&A] Web chunks ({len(web_chunks)}): {[c.source_title for c in web_chunks]}")
        except Exception as e:
            print(f"[Q&A] Web retrieval failed: {e}")
    else:
        print(f"[Q&A] Using local RAG only (not a concept question)")
    
    # Combine and prioritize: web > PDFs > internal
    all_chunks = web_chunks + local_chunks
    chunks = _prioritize_chunks_for_qna(all_chunks, max_items=6)
    
    # Log retrieved sources for debugging
    print(f"[Q&A] Final sources: {[c.source_title for c in chunks]}")
    for idx, c in enumerate(chunks):
        source_type = "WEB" if "http" in c.source_url and c.badge_type in ("government", "academic") else "LOCAL"
        print(f"  [{idx}] [{source_type}] {c.source_title} ({c.badge_type}): {c.content[:150]}...")

    local_context = _chunks_to_prompt_block(local_chunks)
    web_context = _chunks_to_prompt_block(web_chunks)
    print(f"[Q&A] Final local_context length: {len(local_context)}")
    print(f"[Q&A] Final web_context length: {len(web_context)}")
    
    # Build prompt with Q&A template
    prompt = (
        _QNA_PROMPT
        .replace("{question}", question)
        .replace("{plan_outcomes}", json.dumps(plan_outcomes, indent=2, ensure_ascii=False))
        .replace("{local_context}", local_context)
        .replace("{web_context}", web_context)
    )
    
    # Generate answer via LLM
    try:
        answer = complete(system=_SYSTEM_PROMPT, user=prompt, max_tokens=1024)
    except Exception as e:
        # Fallback to simple plan-based answer if LLM fails
        print(f"[Q&A] LLM error: {e}")
        answer = (
            f"Based on your current financial position: "
            f"saving readiness {plan_outcomes.get('saving_score', 0)}/10, "
            f"investment readiness {plan_outcomes.get('investment_score', 0)}/10. "
            f"Main blockers: {', '.join(plan_outcomes.get('primary_blockers', [])[:3])}."
        )
    
    return answer, chunks

@router.post("")
async def post_chat(body: ChatRequest) -> dict[str, Any]:
    message = body.message
    profile = body.profile
    sid = _get_or_create_session(body.session_id, profile)
    sess = _sessions[sid]
    sess["messages"].append({"role": "user", "content": message})

    # Live quote lookup if user asked about a ticker (VOO, QQQ, BND, SPY, SCHD)
    tickers = _tickers_mentioned(message)
    live_quotes_text, market_sources = _fetch_live_quotes(tickers) if tickers else ("", [])

    # Build plan outcomes for personalization
    plan_outcomes = build_plan_outcomes(profile)
    qtype = _question_type(message)

    # Route to appropriate answer path
    if qtype == "wealth_building":
        # Use deterministic wealth-building answer (already working well)
        reply = _deterministic_wealth_answer(profile, plan_outcomes)
        # Still retrieve for citations
        chunks = retrieve(query=message, topic_filter=None, k=4)
    else:
        # Use new Q&A flow with web + local RAG
        reply, chunks = await _answer_user_question(message, profile, plan_outcomes)

    sess["messages"].append({"role": "assistant", "content": reply})
    sources: list[Source] = chunks_to_sources(chunks)
    sources = sources + market_sources

    return {"message": reply, "sources": [s.model_dump() for s in sources], "session_id": sid}
