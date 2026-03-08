"""InsightResponse — mirrors shared/schemas/insight.ts."""
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.sources import Source


class Insight(BaseModel):
    recommendation: str
    principle: str
    behavioral_flags: list[str] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)


class ActionStep(BaseModel):
    title: str
    description: str
    time_label: str


class PlanOutcomes(BaseModel):
    saving_score: float
    investment_score: float
    priority_goal: str
    primary_blockers: list[str] = Field(default_factory=list)
    monthly_target_saving: float
    debt_paydown_target: float
    months_to_1mo_emergency_fund: float | None = None
    months_to_3mo_emergency_fund: float | None = None
    readiness_status: str
    monthly_invest_amount: float
    suggested_etfs: list[str] = Field(default_factory=list)
    suggested_allocation: dict[str, float] = Field(default_factory=dict)
    action_plan_90d: list[dict[str, Any]] = Field(default_factory=list)
    top_money_leaks: list[dict[str, Any]] = Field(default_factory=list)
    what_improves_score_fastest: list[dict[str, Any]] = Field(default_factory=list)


class LlmExplanations(BaseModel):
    summary: str = ""
    encouragement: str = ""
    insight_explanations: list[str] = Field(default_factory=list)


class InsightResponse(BaseModel):
    insights: list[Insight] = Field(default_factory=list)
    action_plan: list[ActionStep] = Field(default_factory=list, alias="action_plan")
    narrative: str = ""
    disclaimer: str = ""
    plan_outcomes: PlanOutcomes | None = None
    llm_explanations: LlmExplanations | None = None
    sources_used: list[Source] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


DEFAULT_DISCLAIMER = (
    "FinSight AI provides educational insights and planning support — not personalized "
    "financial advice. For major financial decisions, consult a certified financial planner."
)
