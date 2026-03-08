"""Compute saving_readiness_score and investment_readiness_score (0-10)."""
from __future__ import annotations

from app.models import BehavioralProfile, QuestionnaireSummary, UserProfile


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def saving_readiness(questionnaire: QuestionnaireSummary, behavioral: BehavioralProfile) -> float:
    """
    Heuristic 0-10: higher if savings rate good, emergency fund behavior, low debt, no spending gap.
    """
    score = 5.0  # base

    # Savings rate
    sr = behavioral.savings_rate_pct
    if sr is not None:
        if sr >= 20:
            score += 2
        elif sr >= 10:
            score += 1
        elif sr < 5:
            score -= 1.5
        elif sr < 0:
            score -= 2

    # Flags that hurt
    flags = set(behavioral.flags or [])
    if "no_emergency_fund" in flags:
        score -= 1.5
    if "spending_gap" in flags:
        score -= 1
    if "high_credit_utilization" in flags:
        score -= 1
    if "high_debt_burden" in flags:
        score -= 1

    # Debt levels
    loan = questionnaire.loan_balance or 0
    cc = questionnaire.credit_card_balance or 0
    income = questionnaire.income_monthly or 1
    if cc > income * 2:
        score -= 1
    if loan > income * 24:
        score -= 0.5

    return round(_clamp(score, 0, 10), 1)


def investment_readiness(questionnaire: QuestionnaireSummary, behavioral: BehavioralProfile) -> float:
    """
    Heuristic 0-10: invest only when saving readiness is decent and debt under control.
    """
    # Start from saving readiness idea
    save_score = saving_readiness(questionnaire, behavioral)
    score = max(0, save_score - 1)  # investment is one step beyond saving

    flags = set(behavioral.flags or [])
    if "high_credit_utilization" in flags or "high_debt_burden" in flags:
        score -= 2
    if "no_emergency_fund" in flags:
        score -= 1

    # Goal: investing boosts a bit if they're close
    if questionnaire.primary_goal == "investing" and save_score >= 4:
        score += 0.5

    return round(_clamp(score, 0, 10), 1)


def build_profile(
    questionnaire: QuestionnaireSummary,
    behavioral: BehavioralProfile,
    analysis_period_months: int | None = None,
) -> UserProfile:
    """Build full UserProfile from questionnaire and behavioral."""
    save = saving_readiness(questionnaire, behavioral)
    invest = investment_readiness(questionnaire, behavioral)
    return UserProfile(
        questionnaire=questionnaire,
        behavioral=behavioral,
        saving_readiness_score=save,
        investment_readiness_score=invest,
        analysis_period_months=analysis_period_months,
    )
