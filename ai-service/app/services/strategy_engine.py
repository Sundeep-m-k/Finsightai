"""Orchestrate: profile -> topics -> retrieve -> prompt -> Gemini -> InsightResponse."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from app.clients.llm_client import complete_json
from app.rag.retriever import retrieve
from app.schemas.insight import InsightResponse
from app.schemas.profile import UserProfile
from app.schemas.sources import RetrievedChunk, TopicTag
from app.services.macro_context import get_macro_context
from app.services.response_parser import parse_strategy_response

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

# Cache prompt files at module level — read from disk once, not per request
_SYSTEM_PROMPT: str = (_PROMPTS_DIR / "system_prompt.txt").read_text(encoding="utf-8")
_STRATEGY_PROMPT: str = (_PROMPTS_DIR / "strategy_prompt.txt").read_text(encoding="utf-8")

# In-memory cache: profile_hash -> InsightResponse
# Prevents repeated Gemini calls for the same profile (e.g. user refreshes dashboard)
_strategy_cache: dict[str, InsightResponse] = {}


# Map profile flags and goal to RAG topics for filtered retrieval
def _topics_for_profile(profile: UserProfile) -> list[TopicTag]:
    topics: list[TopicTag] = ["behavioral", "saving"]
    flags = set(profile.behavioral.flags)
    goal = profile.questionnaire.primary_goal

    if "high_credit_utilization" in flags or "high_debt_burden" in flags:
        topics.extend(["credit", "debt"])
    if "no_emergency_fund" in flags or "spending_gap" in flags:
        topics.append("emergency-fund")
    if goal == "investing":
        topics.extend(["investing", "emergency-fund"])
    if goal == "debt_payoff":
        topics.extend(["debt", "credit"])
    if goal == "budgeting":
        topics.append("budgeting")

    return list(dict.fromkeys(topics))  # unique, order preserved


def _profile_summary(profile: UserProfile) -> str:
    q = profile.questionnaire
    b = profile.behavioral
    parts = [
        f"Income: ${q.income_monthly or 0:.0f}/mo, Expenses: ${q.expenses_monthly or 0:.0f}/mo",
        f"Savings rate: {b.savings_rate_pct or 0:.1f}%",
        f"Loan balance: ${q.loan_balance or 0:.0f}, Credit card balance: ${q.credit_card_balance or 0:.0f}",
        f"Primary goal: {q.primary_goal}",
        f"Behavioral flags: {', '.join(b.flags) or 'none'}",
        f"Said vs actual spending gap: {b.said_vs_actual_gap_pct or 0:.0f}%",
        f"Saving readiness: {profile.saving_readiness_score}/10, Investment readiness: {profile.investment_readiness_score}/10",
    ]
    return "\n".join(parts)


def _format_chunks_for_prompt(chunks: list[RetrievedChunk]) -> str:
    lines = []
    for i, c in enumerate(chunks, 1):
        lines.append(
            f"[Chunk {i}] source_title={c.source_title} | source_url={c.source_url} | "
            f"topic={c.topic} | relevance_score={c.relevance_score}\n{c.content}"
        )
    return "\n\n---\n\n".join(lines)


def _profile_hash(profile: UserProfile) -> str:
    """Stable hash of the profile for caching."""
    key = json.dumps(profile.model_dump(), sort_keys=True, default=str)
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def run(profile: UserProfile) -> InsightResponse:
    cache_key = _profile_hash(profile)
    if cache_key in _strategy_cache:
        return _strategy_cache[cache_key]

    topics = _topics_for_profile(profile)
    query = (
        "financial strategy for college student: "
        f"goal {profile.questionnaire.primary_goal}, "
        f"flags {', '.join(profile.behavioral.flags) or 'none'}"
    )
    chunks = retrieve(query=query, topic_filter=topics if topics else None)

    macro = get_macro_context()
    profile_summary = _profile_summary(profile)
    rag_block = _format_chunks_for_prompt(chunks)

    user = _STRATEGY_PROMPT.format(
        MACRO_CONTEXT=macro,
        PROFILE_SUMMARY=profile_summary,
        RAG_CHUNKS=rag_block,
    )

    raw = complete_json(system=_SYSTEM_PROMPT, user=user)
    result = parse_strategy_response(raw)
    _strategy_cache[cache_key] = result
    return result
