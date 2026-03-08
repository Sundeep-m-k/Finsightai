from __future__ import annotations

from statistics import pstdev
from typing import Any

from models import BehavioralProfile, CategoryAggregate, QuestionnaireInput


OVESPEND_BENCHMARKS: dict[str, float] = {
    "dining": 200,
    "entertainment": 100,
    "subscriptions": 50,
    "transport": 150,
    "groceries": 250,
}


def _aggregate_map(category_aggregates: list[CategoryAggregate]) -> dict[str, CategoryAggregate]:
    return {item.category: item for item in category_aggregates}


def _safe_div(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _volatility_band(std_value: float) -> str:
    if std_value < 100:
        return "low"
    if std_value < 300:
        return "medium"
    return "high"


def _debt_trend(
    debt_payment_trend: str | None,
    questionnaire: QuestionnaireInput,
) -> str:
    if questionnaire.credit_card_balance > 0 and questionnaire.credit_card_limit > 0:
        utilization = questionnaire.credit_card_balance / questionnaire.credit_card_limit
        if utilization > 0.5:
            return "growing"

    if debt_payment_trend == "increasing":
        return "growing"
    if debt_payment_trend == "decreasing":
        return "shrinking"
    return "stable"


def _top_overspend_categories(aggregate_lookup: dict[str, CategoryAggregate]) -> list[str]:
    ranked: list[tuple[str, float]] = []

    for category, benchmark in OVESPEND_BENCHMARKS.items():
        agg = aggregate_lookup.get(category)
        if not agg or benchmark <= 0:
            continue

        ratio = agg.monthly_avg / benchmark
        if ratio > 1.2:
            ranked.append((category, ratio))

    ranked.sort(key=lambda item: item[1], reverse=True)
    return [category for category, _ in ranked[:3]]


def _monthly_series(
    aggregate_lookup: dict[str, CategoryAggregate],
    category: str,
    total_months: int,
) -> list[float]:
    agg = aggregate_lookup.get(category)
    if not agg:
        return [0.0] * total_months

    values = [float(v) for v in agg.months_data]
    if len(values) < total_months:
        values = values + ([0.0] * (total_months - len(values)))
    return values[:total_months]


def _build_behavioral_flags(
    questionnaire: QuestionnaireInput,
    aggregate_lookup: dict[str, CategoryAggregate],
    monthly_surplus_avg: float,
    surplus_volatility: str,
    savings_rate_actual: float,
    expense_avg: float,
    total_months: int,
) -> list[str]:
    flags: list[str] = []

    credit_card_limit = questionnaire.credit_card_limit
    credit_card_balance = questionnaire.credit_card_balance

    cc_utilization = (
        credit_card_balance / credit_card_limit
        if credit_card_limit > 0
        else 0.0
    )

    savings_avg = aggregate_lookup.get("savings_transfer", CategoryAggregate(
        category="savings_transfer",
        monthly_avg=0.0,
        months_data=[0.0] * total_months,
        trend="stable",
    )).monthly_avg

    subscriptions_avg = aggregate_lookup.get("subscriptions", CategoryAggregate(
        category="subscriptions",
        monthly_avg=0.0,
        months_data=[0.0] * total_months,
        trend="stable",
    )).monthly_avg

    dining_avg = aggregate_lookup.get("dining", CategoryAggregate(
        category="dining",
        monthly_avg=0.0,
        months_data=[0.0] * total_months,
        trend="stable",
    )).monthly_avg

    debt_payment_avg = aggregate_lookup.get("debt_payment", CategoryAggregate(
        category="debt_payment",
        monthly_avg=0.0,
        months_data=[0.0] * total_months,
        trend="stable",
    )).monthly_avg

    current_savings = max(0.0, monthly_surplus_avg * 2)
    cc_min_payment = max(25.0, credit_card_balance * 0.02) if credit_card_balance > 0 else 0.0
    loan_payment = debt_payment_avg
    high_debt_to_income = _safe_div(
        loan_payment + cc_min_payment,
        questionnaire.monthly_income,
    ) > 0.2

    income_series = _monthly_series(aggregate_lookup, "income", total_months)
    expense_series = [0.0] * total_months
    for category, agg in aggregate_lookup.items():
        if category == "income":
            continue
        series = _monthly_series(aggregate_lookup, category, total_months)
        expense_series = [a + b for a, b in zip(expense_series, series)]

    surplus_series = [income - expense for income, expense in zip(income_series, expense_series)]
    negative_balance_months = any(month_surplus < -100 for month_surplus in surplus_series)

    if cc_utilization > 0.3:
        flags.append("cc_utilization_rising")
    if savings_rate_actual < 3.0:
        flags.append("surplus_not_saved")
    if current_savings < expense_avg * 1:
        flags.append("emergency_fund_critical")
    if high_debt_to_income:
        flags.append("high_debt_to_income")
    if surplus_volatility == "high":
        flags.append("surplus_volatile")
    if negative_balance_months:
        flags.append("negative_balance_months")
    if subscriptions_avg > 80:
        flags.append("subscription_creep")
    if dining_avg > 300:
        flags.append("dining_overspend")

    return flags


def compute_behavioral_profile(
    questionnaire: QuestionnaireInput,
    category_aggregates: list[CategoryAggregate],
    months_analyzed: int,
) -> BehavioralProfile:
    if months_analyzed <= 0:
        raise ValueError("months_analyzed must be greater than 0")

    aggregate_lookup = _aggregate_map(category_aggregates)

    income_avg = aggregate_lookup.get(
        "income",
        CategoryAggregate(category="income", monthly_avg=0.0, months_data=[0.0] * months_analyzed, trend="stable"),
    ).monthly_avg

    expense_categories = [
        agg for agg in category_aggregates
        if agg.category != "income"
    ]
    total_expense_avg = sum(agg.monthly_avg for agg in expense_categories)

    monthly_surplus_avg = round(income_avg - total_expense_avg, 2)

    income_series = _monthly_series(aggregate_lookup, "income", months_analyzed)
    expense_series = [0.0] * months_analyzed
    for agg in expense_categories:
        cat_series = _monthly_series(aggregate_lookup, agg.category, months_analyzed)
        expense_series = [a + b for a, b in zip(expense_series, cat_series)]

    surplus_per_month = [round(i - e, 2) for i, e in zip(income_series, expense_series)]
    surplus_std = float(pstdev(surplus_per_month)) if len(surplus_per_month) > 1 else 0.0
    surplus_volatility = _volatility_band(surplus_std)

    savings_transfer_avg = aggregate_lookup.get(
        "savings_transfer",
        CategoryAggregate(category="savings_transfer", monthly_avg=0.0, months_data=[0.0] * months_analyzed, trend="stable"),
    ).monthly_avg

    savings_rate_actual = round(_safe_div(savings_transfer_avg, income_avg) * 100, 2)
    savings_rate_stated = round(
        _safe_div(
            questionnaire.monthly_income - questionnaire.fixed_expenses,
            questionnaire.monthly_income,
        ) * 100,
        2,
    )

    debt_payment_trend = aggregate_lookup.get("debt_payment")
    debt_trend = _debt_trend(
        debt_payment_trend.trend if debt_payment_trend else None,
        questionnaire,
    )

    top_overspend_categories = _top_overspend_categories(aggregate_lookup)

    behavioral_flags = _build_behavioral_flags(
        questionnaire=questionnaire,
        aggregate_lookup=aggregate_lookup,
        monthly_surplus_avg=monthly_surplus_avg,
        surplus_volatility=surplus_volatility,
        savings_rate_actual=savings_rate_actual,
        expense_avg=total_expense_avg,
        total_months=months_analyzed,
    )

    return BehavioralProfile(
        monthly_surplus_avg=monthly_surplus_avg,
        surplus_volatility=surplus_volatility,
        savings_rate_actual=savings_rate_actual,
        savings_rate_stated=savings_rate_stated,
        top_overspend_categories=top_overspend_categories,
        debt_trend=debt_trend,
        behavioral_flags=behavioral_flags,
        category_aggregates=category_aggregates,
        months_analyzed=months_analyzed,
    )