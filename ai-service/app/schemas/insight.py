"""InsightResponse — mirrors shared/schemas/insight.ts."""
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


class InsightResponse(BaseModel):
    insights: list[Insight] = Field(default_factory=list)
    action_plan: list[ActionStep] = Field(default_factory=list, alias="action_plan")
    narrative: str = ""
    disclaimer: str = ""

    model_config = {"populate_by_name": True}


DEFAULT_DISCLAIMER = (
    "FinSight AI provides educational insights and planning support — not personalized "
    "financial advice. For major financial decisions, consult a certified financial planner."
)
