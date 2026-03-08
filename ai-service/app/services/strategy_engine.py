"""Orchestrate: profile -> deterministic plan -> retrieve -> LLM verbalization -> merged response."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from app.clients.llm_client import complete_json
from app.rag.retriever import retrieve
from app.schemas.insight import ActionStep, Insight, InsightResponse
from app.schemas.profile import UserProfile
from app.schemas.sources import RetrievedChunk, Source, TopicTag
from app.services.macro_context import get_macro_context
from app.services.response_parser import parse_strategy_response

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

# Cache prompt files at module level — read from disk once, not per request
_SYSTEM_PROMPT: str = (_PROMPTS_DIR / "system_prompt.txt").read_text(encoding="utf-8")
_STRATEGY_PROMPT: str = (_PROMPTS_DIR / "strategy_prompt.txt").read_text(encoding="utf-8")

# In-memory cache: profile_hash -> InsightResponse
# Prevents repeated Gemini calls for the same profile (e.g. user refreshes dashboard)
_strategy_cache: dict[str, InsightResponse] = {}
_MAX_CACHE_SIZE = 200


def _monthly_surplus(profile: UserProfile) -> float:
    income = float(profile.questionnaire.income_monthly or 0)
    expenses = float(
        profile.behavioral.avg_monthly_spending
        or profile.questionnaire.expenses_monthly
        or 0
    )
    return round(income - expenses, 2)


def _credit_utilization(profile: UserProfile) -> float:
    cc_limit = float(profile.questionnaire.cc_limit or 0)
    cc_balance = float(profile.questionnaire.credit_card_balance or 0)
    if cc_limit <= 0:
        return 0.0
    return cc_balance / cc_limit


def build_plan_outcomes(profile: UserProfile) -> dict[str, Any]:
    saving_score = round(float(profile.saving_readiness_score), 1)
    investment_score = round(float(profile.investment_readiness_score), 1)
    monthly_surplus = _monthly_surplus(profile)
    cc_util = _credit_utilization(profile)
    flags = set(profile.behavioral.flags)

    blockers: list[str] = []
    if "no_emergency_fund" in flags:
        blockers.append("No emergency cushion yet")
    if "high_debt_burden" in flags:
        blockers.append("Debt pressure is limiting flexibility")
    if "high_credit_utilization" in flags or cc_util > 0.30:
        blockers.append("Credit card utilization is above healthy range")
    if "irregular_income" in flags:
        blockers.append("Income and savings pattern is unstable")
    if monthly_surplus <= 0:
        blockers.append("Monthly surplus is not consistently positive")

    if not blockers:
        blockers.append("Maintain consistency to unlock faster progress")

    top_leaks: list[dict[str, Any]] = []
    for gap in sorted(profile.gap_analysis or [], key=lambda item: item.delta_pct, reverse=True):
        if gap.delta_pct <= 0:
            continue
        amount_above_target = max(0.0, round(gap.actual - gap.stated, 2))
        if amount_above_target <= 0:
            continue
        top_leaks.append(
            {
                "category": gap.category,
                "amount_above_target": amount_above_target,
                "delta_pct": round(gap.delta_pct, 1),
            }
        )
        if len(top_leaks) == 3:
            break

    if monthly_surplus > 0:
        monthly_target_saving = round(max(25.0, monthly_surplus * 0.6), 2)
        debt_paydown_target = round(max(0.0, min(monthly_surplus * 0.3, 250.0)), 2)
    else:
        monthly_target_saving = 25.0
        debt_paydown_target = 0.0

    monthly_expenses = float(
        profile.behavioral.avg_monthly_spending
        or profile.questionnaire.expenses_monthly
        or 0
    )
    
    # Emergency fund targets (deterministic, based on monthly expenses)
    emergency_fund_1mo_target = round(monthly_expenses, 2)
    emergency_fund_3mo_target = round(monthly_expenses * 3, 2)
    starter_emergency_target = min(1000.0, emergency_fund_1mo_target * 0.5)
    
    print(f"[EMERGENCY FUND] Monthly expenses: ${monthly_expenses:.2f}")
    print(f"[EMERGENCY FUND] 1-month target: ${emergency_fund_1mo_target:.2f}")
    print(f"[EMERGENCY FUND] 3-month target: ${emergency_fund_3mo_target:.2f}")
    print(f"[EMERGENCY FUND] Starter target: ${starter_emergency_target:.2f}")
    
    # Calculate months to reach each target
    emergency_unit = monthly_target_saving if monthly_target_saving > 0 else 0
    months_to_1mo = round(emergency_fund_1mo_target / emergency_unit, 1) if emergency_unit > 0 else None
    months_to_3mo = round(emergency_fund_3mo_target / emergency_unit, 1) if emergency_unit > 0 else None

    if investment_score >= 6.5 and monthly_surplus > 0:
        readiness_status = "ready"
    elif saving_score >= 4.0 and monthly_surplus > 0:
        readiness_status = "preparing"
    else:
        readiness_status = "not_ready"

    risk = profile.questionnaire.risk_tolerance or "medium"
    if readiness_status == "ready":
        monthly_invest_amount = round(max(25.0, min(monthly_surplus * 0.35, 300.0)), 2)
        if risk == "low":
            suggested_etfs = ["BND", "VTI"]
            suggested_allocation = {"BND": 40.0, "VTI": 60.0}
        elif risk == "high":
            suggested_etfs = ["VTI", "QQQM"]
            suggested_allocation = {"VTI": 70.0, "QQQM": 30.0}
        else:
            suggested_etfs = ["VTI", "VXUS"]
            suggested_allocation = {"VTI": 75.0, "VXUS": 25.0}
    elif readiness_status == "preparing":
        monthly_invest_amount = 0.0
        suggested_etfs = ["VTI"]
        suggested_allocation = {"VTI": 100.0}
    else:
        monthly_invest_amount = 0.0
        suggested_etfs = []
        suggested_allocation = {}

    primary_goal = profile.questionnaire.primary_goal
    if readiness_status == "not_ready":
        priority_goal = "Build starter emergency fund and stabilize surplus"
    elif primary_goal == "debt_payoff":
        priority_goal = "Accelerate debt payoff while preserving savings momentum"
    elif primary_goal == "investing":
        priority_goal = "Start consistent investing with a stable monthly contribution"
    elif primary_goal == "budgeting":
        priority_goal = "Improve spending consistency and protect surplus"
    else:
        priority_goal = "Strengthen saving foundation"

    action_plan_90d = [
        {
            "phase": "Days 1-30",
            "actions": [
                (
                    f"Reduce {top_leaks[0]['category'].replace('_', ' ')} overspend by "
                    f"${round(top_leaks[0]['amount_above_target'] * 0.6, 0):.0f}/month"
                ) if top_leaks else "Reduce discretionary spending by at least $50/month",
                f"Set automatic savings transfer to ${monthly_target_saving:.0f} per month",
                (
                    f"Pay extra ${debt_paydown_target:.0f} toward revolving debt"
                ) if debt_paydown_target > 0 else "Track weekly spending and avoid new revolving debt",
            ],
        },
        {
            "phase": "Days 31-60",
            "actions": [
                (
                    f"Reach ${(monthly_target_saving * 2):.0f} cumulative emergency savings"
                ),
                "Keep spending under planned limits for 3 straight weeks",
                (
                    "Bring credit utilization below 40%"
                    if ("high_credit_utilization" in flags or cc_util > 0.40)
                    else "Maintain credit utilization below 30%"
                ),
            ],
        },
        {
            "phase": "Days 61-90",
            "actions": [
                f"Reach ${(monthly_target_saving * 3):.0f} cumulative emergency savings",
                "Sustain automatic saving for 3 consecutive months",
                (
                    f"Start investing ${monthly_invest_amount:.0f}/month"
                    if monthly_invest_amount > 0
                    else "Re-check investing readiness after surplus stabilizes"
                ),
            ],
        },
    ]

    what_improves_score_fastest = [
        {
            "action": "Reduce discretionary overspend in top leak category",
            "estimated_score_gain": 0.8,
            "impacts": ["saving_readiness"],
        },
        {
            "action": "Automate monthly savings and avoid missed transfers",
            "estimated_score_gain": 0.6,
            "impacts": ["saving_readiness", "investment_readiness"],
        },
        {
            "action": "Lower credit card utilization below 30%",
            "estimated_score_gain": 1.1,
            "impacts": ["investment_readiness"],
        },
    ]

    return {
        "saving_score": saving_score,
        "investment_score": investment_score,
        "priority_goal": priority_goal,
        "primary_blockers": blockers,
        "monthly_target_saving": monthly_target_saving,
        "debt_paydown_target": debt_paydown_target,
        "emergency_fund_1mo_target": emergency_fund_1mo_target,
        "emergency_fund_3mo_target": emergency_fund_3mo_target,
        "starter_emergency_target": starter_emergency_target,
        "months_to_1mo_emergency_fund": months_to_1mo,
        "months_to_3mo_emergency_fund": months_to_3mo,
        "readiness_status": readiness_status,
        "monthly_invest_amount": monthly_invest_amount,
        "suggested_etfs": suggested_etfs,
        "suggested_allocation": suggested_allocation,
        "action_plan_90d": action_plan_90d,
        "top_money_leaks": top_leaks,
        "what_improves_score_fastest": what_improves_score_fastest,
    }


def _sources_from_chunks(chunks: list[RetrievedChunk], limit: int = 2) -> list[Source]:
    out: list[Source] = []
    for c in chunks[:limit]:
        out.append(
            Source(
                title=c.source_title,
                url=c.source_url,
                preview=(c.content[:200]).strip(),
                relevance_score=float(c.relevance_score),
                badge_type=c.badge_type,
            )
        )
    return out


def _deterministic_insights(plan_outcomes: dict[str, Any], profile: UserProfile, chunks: list[RetrievedChunk]) -> list[Insight]:
    flags = profile.behavioral.flags
    sources = _sources_from_chunks(chunks, limit=2)
    insights: list[Insight] = []

    insights.append(
        Insight(
            recommendation=f"Priority goal: {plan_outcomes['priority_goal']}",
            principle=(
                f"Current readiness is {plan_outcomes['readiness_status'].replace('_', ' ')} "
                f"with saving score {plan_outcomes['saving_score']}/10 and investment score {plan_outcomes['investment_score']}/10."
            ),
            behavioral_flags=list(flags),
            sources=sources,
        )
    )

    if plan_outcomes["top_money_leaks"]:
        leak = plan_outcomes["top_money_leaks"][0]
        insights.append(
            Insight(
                recommendation=(
                    f"Top leak is {leak['category'].replace('_', ' ')} at "
                    f"${leak['amount_above_target']:.0f}/month above target"
                ),
                principle="Reducing the largest recurring overspend category is the fastest way to recover surplus.",
                behavioral_flags=["spending_gap"],
                sources=sources,
            )
        )

    blockers_text = "; ".join(plan_outcomes["primary_blockers"][:2])
    insights.append(
        Insight(
            recommendation="Address blockers before scaling investments",
            principle=(
                f"Primary blockers detected: {blockers_text}. "
                "Removing these blockers improves consistency and risk capacity."
            ),
            behavioral_flags=list(flags),
            sources=sources,
        )
    )

    return insights[:4]


def _deterministic_action_plan(plan_outcomes: dict[str, Any]) -> list[ActionStep]:
    steps: list[ActionStep] = []
    for phase in plan_outcomes["action_plan_90d"]:
        title = phase["phase"]
        description = "; ".join(phase["actions"])
        steps.append(
            ActionStep(
                title=title,
                description=description,
                time_label=title,
            )
        )
    return steps


def _fallback_llm_result(plan_outcomes: dict[str, Any]) -> InsightResponse:
    readiness = str(plan_outcomes.get("readiness_status", "not_ready")).replace("_", " ")
    saving_score = plan_outcomes.get("saving_score", 0)
    invest_score = plan_outcomes.get("investment_score", 0)
    monthly_target_saving = plan_outcomes.get("monthly_target_saving", 0)
    debt_target = plan_outcomes.get("debt_paydown_target", 0)
    blockers = plan_outcomes.get("primary_blockers", [])
    blocker_text = "; ".join(blockers[:2]) if blockers else "maintaining consistency"

    narrative = (
        f"Your current readiness is {readiness} (saving {saving_score}/10, investment {invest_score}/10). "
        f"Focus this month on saving ${monthly_target_saving:.0f} and debt paydown ${debt_target:.0f} while addressing {blocker_text}."
    )

    return InsightResponse(
        insights=[],
        action_plan=[],
        narrative=narrative,
        disclaimer=(
            "FinSight AI provides educational insights and planning support — not personalized "
            "financial advice. For major financial decisions, consult a certified financial planner."
        ),
    )


def _merge_plan_and_llm(
    profile: UserProfile,
    plan_outcomes: dict[str, Any],
    llm_result: InsightResponse,
    chunks: list[RetrievedChunk],
) -> InsightResponse:
    deterministic_insights = _deterministic_insights(plan_outcomes, profile, chunks)
    deterministic_actions = _deterministic_action_plan(plan_outcomes)
    llm_explanations = {
        "summary": llm_result.narrative,
        "insight_explanations": [item.principle for item in llm_result.insights],
        "encouragement": llm_result.narrative,
    }

    return InsightResponse(
        insights=deterministic_insights,
        action_plan=deterministic_actions,
        narrative=llm_result.narrative,
        disclaimer=llm_result.disclaimer,
        plan_outcomes=plan_outcomes,
        llm_explanations=llm_explanations,
        sources_used=_sources_from_chunks(chunks, limit=4),
    )


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

    plan_outcomes = build_plan_outcomes(profile)

    topics = _topics_for_profile(profile)
    query = (
        "financial strategy for college student: "
        f"goal {profile.questionnaire.primary_goal}, "
        f"flags {', '.join(profile.behavioral.flags) or 'none'}"
    )
    # Use k=4 for faster retrieval (reduced from default ~10)
    chunks = retrieve(query=query, topic_filter=topics if topics else None, k=4)

    macro = get_macro_context()
    profile_summary = _profile_summary(profile)
    rag_block = (
        _format_chunks_for_prompt(chunks)
        if chunks
        else "(No knowledge base chunks retrieved — respond based on profile data and general financial principles.)"
    )

    user = (
        _STRATEGY_PROMPT
        .replace("{MACRO_CONTEXT}", macro)
        .replace("{PROFILE_SUMMARY}", profile_summary)
        .replace("{PLAN_OUTCOMES}", json.dumps(plan_outcomes, indent=2, ensure_ascii=False))
        .replace("{RAG_CHUNKS}", rag_block)
    )

    try:
        raw = complete_json(system=_SYSTEM_PROMPT, user=user)
        llm_result = parse_strategy_response(raw)
    except Exception:
        llm_result = _fallback_llm_result(plan_outcomes)

    result = _merge_plan_and_llm(
        profile=profile,
        plan_outcomes=plan_outcomes,
        llm_result=llm_result,
        chunks=chunks,
    )
    if len(_strategy_cache) >= _MAX_CACHE_SIZE:
        _strategy_cache.pop(next(iter(_strategy_cache)))
    _strategy_cache[cache_key] = result
    return result
