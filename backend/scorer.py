from __future__ import annotations

from models import (
    BehavioralProfile,
    GapItem,
    QuestionnaireInput,
    ReadinessReport,
    SavingBreakdown,
)


STATED_CATEGORY_MAP: dict[str, float] = {
    "rent": 0.55,
    "groceries": 0.18,
    "transport": 0.08,
    "dining": 0.07,
    "subscriptions": 0.03,
    "entertainment": 0.04,
    "education": 0.03,
    "health": 0.02,
}


INCOME_STABILITY_SCORES: dict[str, float] = {
    "stable": 9,
    "part_time": 6,
    "stipend": 5,
    "freelance": 3,
}


def _safe_div(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _get_category_avg(behavioral: BehavioralProfile, category: str) -> float:
    for item in behavioral.category_aggregates:
        if item.category == category:
            return float(item.monthly_avg)
    return 0.0


def _get_category_months_data(behavioral: BehavioralProfile, category: str) -> list[float]:
    for item in behavioral.category_aggregates:
        if item.category == category:
            return [float(x) for x in item.months_data]
    return [0.0] * max(behavioral.months_analyzed, 1)


def _estimated_current_savings(behavioral: BehavioralProfile) -> float:
    return max(0.0, behavioral.monthly_surplus_avg * 2)


def _estimated_minimum_debt_payment(questionnaire: QuestionnaireInput, behavioral: BehavioralProfile) -> float:
    debt_payment_avg = _get_category_avg(behavioral, "debt_payment")
    cc_min_payment = (
        max(25.0, questionnaire.credit_card_balance * 0.02)
        if questionnaire.credit_card_balance > 0
        else 0.0
    )
    return debt_payment_avg + cc_min_payment


def _months_with_savings(behavioral: BehavioralProfile) -> int:
    savings_series = _get_category_months_data(behavioral, "savings_transfer")
    return sum(1 for value in savings_series if value > 0)


def _dti_score(dti: float) -> float:
    if dti < 0.15:
        return 9
    if dti < 0.20:
        return 7
    if dti < 0.30:
        return 5
    if dti < 0.40:
        return 3
    return 1


def _saving_narrative(score: float) -> str:
    if score >= 8:
        return "Strong foundation — you're building real financial resilience."
    if score >= 6:
        return "Good progress — close 1–2 gaps to reach investing readiness."
    if score >= 4:
        return "Building momentum — focus on emergency fund and debt consistency."
    if score >= 2:
        return "Early stage — stabilize income, reduce debt pressure first."
    return "Critical gaps — address cash flow and debt before anything else."


def _investment_narrative(score: float, saving_score: float) -> str:
    if saving_score < 4:
        return "Resolve savings foundation first — investing now increases risk."
    if score >= 7:
        return "Ready to start — begin with low-cost index funds."
    if score >= 5:
        return "Almost there — reduce credit card balance first."
    if score >= 3:
        return "Not yet — your surplus volatility makes consistent investing difficult."
    return "Focus on savings — investing before this stage rarely succeeds."


def _gap_status(delta_pct: float) -> str:
    abs_delta = abs(delta_pct)
    if abs_delta >= 30:
        return "red"
    if abs_delta >= 15:
        return "amber"
    return "green"


def build_gap_analysis(
    questionnaire: QuestionnaireInput,
    behavioral: BehavioralProfile,
) -> list[GapItem]:
    gap_items: list[GapItem] = []

    for category, share in STATED_CATEGORY_MAP.items():
        actual = round(_get_category_avg(behavioral, category), 2)

        if category == "rent":
            stated = round(min(questionnaire.fixed_expenses, questionnaire.monthly_income) * share, 2)
        else:
            stated = round(questionnaire.fixed_expenses * share, 2)

        if stated == 0 and actual == 0:
            delta_pct = 0.0
        elif stated == 0:
            delta_pct = 100.0
        else:
            delta_pct = round(((actual - stated) / stated) * 100, 2)

        gap_items.append(
            GapItem(
                category=category,
                stated=stated,
                actual=actual,
                delta_pct=delta_pct,
                status=_gap_status(delta_pct),
            )
        )

    gap_items.sort(key=lambda item: abs(item.delta_pct), reverse=True)
    return gap_items


def compute_readiness_report(
    questionnaire: QuestionnaireInput,
    behavioral: BehavioralProfile,
) -> ReadinessReport:
    monthly_expenses = sum(
        agg.monthly_avg for agg in behavioral.category_aggregates
        if agg.category != "income"
    )
    current_savings = _estimated_current_savings(behavioral)

    emergency_score = min(
        _safe_div(current_savings, monthly_expenses * 3) * 10,
        10,
    ) if monthly_expenses > 0 else 0.0

    total_months = max(behavioral.months_analyzed, 1)
    months_with_savings = _months_with_savings(behavioral)
    consistency_score = (months_with_savings / total_months) * 10

    minimum_debt_payment = _estimated_minimum_debt_payment(questionnaire, behavioral)
    dti = _safe_div(minimum_debt_payment, questionnaire.monthly_income)
    dti_score = _dti_score(dti)

    stability_score = INCOME_STABILITY_SCORES.get(questionnaire.income_type, 3)

    saving_score = (
        emergency_score * 0.30 +
        consistency_score * 0.25 +
        dti_score * 0.25 +
        stability_score * 0.20
    )
    saving_score = round(max(0.0, min(10.0, saving_score)), 2)

    monthly_surplus_avg = behavioral.monthly_surplus_avg
    recommended_emergency_contribution = max(0.0, monthly_surplus_avg * 0.20)
    investable_surplus = (
        monthly_surplus_avg
        - minimum_debt_payment
        - recommended_emergency_contribution
    )
    investable_surplus = round(max(0.0, investable_surplus), 2)

    base = saving_score * 0.5

    if investable_surplus > 300:
        surplus_factor = 2.5
    elif investable_surplus > 150:
        surplus_factor = 1.5
    elif investable_surplus > 50:
        surplus_factor = 0.8
    else:
        surplus_factor = 0.0

    volatility_penalty = {
        "low": 0.0,
        "medium": -0.5,
        "high": -1.5,
    }.get(behavioral.surplus_volatility, -1.5)

    risk_bonus = (questionnaire.risk_comfort - 1) * 0.2
    horizon_bonus = {
        "under_1yr": 0.0,
        "1_3yr": 0.3,
        "3_5yr": 0.6,
        "5plus_yr": 1.0,
    }.get(questionnaire.time_horizon, 0.0)

    cc_penalty = -2.0 if (
        questionnaire.credit_card_balance > 500
        and questionnaire.student_loan_rate > 7
    ) else 0.0

    raw_investment_score = (
        base
        + surplus_factor
        + volatility_penalty
        + risk_bonus
        + horizon_bonus
        + cc_penalty
    )
    investment_score = round(max(0.0, min(10.0, raw_investment_score)), 2)

    if saving_score < 4:
        investment_score = min(investment_score, 3.0)

    target_1mo = monthly_expenses * 1
    target_3mo = monthly_expenses * 3

    gap_1mo = max(0.0, target_1mo - current_savings)
    gap_3mo = max(0.0, target_3mo - current_savings)

    savings_transfer_avg = _get_category_avg(behavioral, "savings_transfer")
    monthly_saving_capacity = max(
        10.0,
        savings_transfer_avg if savings_transfer_avg > 0 else behavioral.monthly_surplus_avg * 0.15,
    )

    months_to_1mo = round(gap_1mo / monthly_saving_capacity, 2)
    months_to_3mo = round(gap_3mo / monthly_saving_capacity, 2)

    gap_analysis = build_gap_analysis(questionnaire, behavioral)

    return ReadinessReport(
        saving_score=saving_score,
        investment_score=investment_score,
        saving_breakdown=SavingBreakdown(
            emergency_fund_coverage=round(emergency_score, 2),
            savings_consistency=round(consistency_score, 2),
            debt_to_income=round(dti_score, 2),
            income_stability=round(stability_score, 2),
        ),
        behavioral_flags=behavioral.behavioral_flags,
        gap_analysis=gap_analysis,
        months_to_1mo_emergency_fund=months_to_1mo,
        months_to_3mo_emergency_fund=months_to_3mo,
        investable_surplus=investable_surplus,
        readiness_narrative=_saving_narrative(saving_score),
        investment_narrative=_investment_narrative(investment_score, saving_score),
    )