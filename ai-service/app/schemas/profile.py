"""UserProfile — mirrors shared/schemas/profile.ts."""
from typing import Literal

from pydantic import BaseModel, Field

PrimaryGoal = Literal["debt_payoff", "emergency_fund", "investing", "budgeting"]
RiskTolerance = Literal["low", "medium", "high"]
BehavioralFlag = Literal[
    "high_credit_utilization",
    "spending_gap",
    "lifestyle_creep",
    "irregular_income",
    "no_emergency_fund",
    "high_debt_burden",
]


class ExpenseCategory(BaseModel):
    category: str
    amount: float
    percentage: float | None = None


class QuestionnaireSummary(BaseModel):
    income_monthly: float | None = None
    expenses_monthly: float | None = None
    loan_balance: float | None = None
    credit_card_balance: float | None = None
    primary_goal: PrimaryGoal
    risk_tolerance: RiskTolerance | None = None
    months_until_graduation: int | None = None


class BehavioralProfile(BaseModel):
    flags: list[BehavioralFlag] = Field(default_factory=list)
    avg_monthly_spending: float | None = None
    savings_rate_pct: float | None = None
    said_vs_actual_gap_pct: float | None = None
    expense_breakdown: list[ExpenseCategory] | None = None


class UserProfile(BaseModel):
    questionnaire: QuestionnaireSummary
    behavioral: BehavioralProfile
    saving_readiness_score: float = Field(ge=0, le=10)
    investment_readiness_score: float = Field(ge=0, le=10)
    analysis_period_months: int | None = None


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    profile: UserProfile
