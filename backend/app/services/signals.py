"""Compute behavioral flags and aggregates from transactions + questionnaire."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.models import BehavioralProfile, ExpenseCategory, QuestionnaireSummary, Transaction


def _expenses_by_month(transactions: list[Transaction]) -> dict[str, float]:
    """Sum expenses (negative amounts) by month YYYY-MM."""
    by_month: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t.amount < 0:
            month = t.date[:7] if len(t.date) >= 7 else t.date
            by_month[month] += abs(t.amount)
    return dict(by_month)


def _expenses_by_category(transactions: list[Transaction]) -> dict[str, float]:
    """Sum expenses by category."""
    by_cat: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t.amount < 0:
            cat = t.category or "Other"
            by_cat[cat] += abs(t.amount)
    return dict(by_cat)


def _income_by_month(transactions: list[Transaction]) -> dict[str, float]:
    by_month: dict[str, float] = defaultdict(float)
    for t in transactions:
        if t.amount > 0:
            month = t.date[:7] if len(t.date) >= 7 else t.date
            by_month[month] += t.amount
    return dict(by_month)


def compute_behavioral(
    transactions: list[Transaction],
    questionnaire: QuestionnaireSummary,
) -> BehavioralProfile:
    """Derive flags, avg spending, savings rate, said vs actual gap, expense breakdown."""
    flags: list[str] = []

    expenses_by_month = _expenses_by_month(transactions)
    income_by_month = _income_by_month(transactions)
    expenses_by_cat = _expenses_by_category(transactions)

    n_months = len(expenses_by_month) or 1
    total_expenses = sum(expenses_by_month.values())
    total_income = sum(income_by_month.values())
    avg_monthly_spending = total_expenses / n_months if n_months else None
    avg_monthly_income = total_income / n_months if n_months else None

    # Savings rate: (income - expenses) / income
    savings_rate_pct: float | None = None
    if avg_monthly_income and avg_monthly_income > 0 and avg_monthly_spending is not None:
        savings_rate_pct = round(((avg_monthly_income - avg_monthly_spending) / avg_monthly_income) * 100, 1)
        if savings_rate_pct < 0:
            savings_rate_pct = 0

    # Said vs actual: compare stated expenses (questionnaire) vs actual
    stated = questionnaire.expenses_monthly or 0
    said_vs_actual_gap_pct: float | None = None
    if stated > 0 and avg_monthly_spending is not None and avg_monthly_spending > 0:
        gap = ((avg_monthly_spending - stated) / stated) * 100
        said_vs_actual_gap_pct = round(gap, 1)
        if said_vs_actual_gap_pct > 10:
            flags.append("spending_gap")

    # No emergency fund: no "Savings" category or very low savings rate
    if savings_rate_pct is not None and savings_rate_pct < 5:
        flags.append("no_emergency_fund")
    if "Savings" not in expenses_by_cat or expenses_by_cat.get("Savings", 0) < 50:
        if "no_emergency_fund" not in flags:
            flags.append("no_emergency_fund")

    # High credit utilization: from questionnaire
    cc_balance = questionnaire.credit_card_balance or 0
    if cc_balance > 1000 and questionnaire.income_monthly and questionnaire.income_monthly > 0:
        # Simplified: high balance relative to income
        if cc_balance / questionnaire.income_monthly > 0.3:
            flags.append("high_credit_utilization")

    # High debt burden
    loan = questionnaire.loan_balance or 0
    if loan + cc_balance > 20000 and questionnaire.income_monthly and questionnaire.income_monthly > 0:
        if (loan + cc_balance) / (questionnaire.income_monthly * 12) > 0.5:
            flags.append("high_debt_burden")

    # Expense breakdown with percentages
    total_cat = sum(expenses_by_cat.values()) or 1
    expense_breakdown = [
        ExpenseCategory(category=c, amount=round(amt, 2), percentage=round((amt / total_cat) * 100, 1))
        for c, amt in sorted(expenses_by_cat.items(), key=lambda x: -x[1])
    ]

    return BehavioralProfile(
        flags=flags,
        avg_monthly_spending=round(avg_monthly_spending, 2) if avg_monthly_spending is not None else None,
        savings_rate_pct=savings_rate_pct,
        said_vs_actual_gap_pct=said_vs_actual_gap_pct,
        expense_breakdown=expense_breakdown if expense_breakdown else None,
    )
