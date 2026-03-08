from pydantic import BaseModel, Field, field_validator
from typing import Optional



class QuestionnaireInput(BaseModel):
    monthly_income: float = Field(..., ge=0)
    fixed_expenses: float = Field(..., ge=0)
    student_loan_balance: float = Field(0, ge=0)
    student_loan_rate: float = Field(0, ge=0)
    credit_card_balance: float = Field(0, ge=0)
    credit_card_limit: float = Field(0, ge=0)
    goal: str  # "pay_debt" | "emergency_fund" | "start_investing" | "save_for_goal"
    risk_comfort: int = Field(..., ge=1, le=5)
    time_horizon: str  # "under_1yr" | "1_3yr" | "3_5yr" | "5plus_yr"
    income_type: str  # "stable" | "part_time" | "freelance" | "stipend"

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, value: str) -> str:
        allowed = {"pay_debt", "emergency_fund", "start_investing", "save_for_goal"}
        if value not in allowed:
            raise ValueError(f"goal must be one of {sorted(allowed)}")
        return value

    @field_validator("time_horizon")
    @classmethod
    def validate_time_horizon(cls, value: str) -> str:
        allowed = {"under_1yr", "1_3yr", "3_5yr", "5plus_yr"}
        if value not in allowed:
            raise ValueError(f"time_horizon must be one of {sorted(allowed)}")
        return value

    @field_validator("income_type")
    @classmethod
    def validate_income_type(cls, value: str) -> str:
        allowed = {"stable", "part_time", "freelance", "stipend"}
        if value not in allowed:
            raise ValueError(f"income_type must be one of {sorted(allowed)}")
        return value


class CategoryAggregate(BaseModel):
    category: str
    monthly_avg: float
    months_data: list[float]
    trend: str  # "increasing" | "stable" | "decreasing"

    @field_validator("trend")
    @classmethod
    def validate_trend(cls, value: str) -> str:
        allowed = {"increasing", "stable", "decreasing"}
        if value not in allowed:
            raise ValueError(f"trend must be one of {sorted(allowed)}")
        return value


class BehavioralProfile(BaseModel):
    monthly_surplus_avg: float
    surplus_volatility: str  # "low" | "medium" | "high"
    savings_rate_actual: float
    savings_rate_stated: float
    top_overspend_categories: list[str]
    debt_trend: str  # "growing" | "stable" | "shrinking"
    behavioral_flags: list[str]
    category_aggregates: list[CategoryAggregate]
    months_analyzed: int = Field(..., ge=0)

    @field_validator("surplus_volatility")
    @classmethod
    def validate_surplus_volatility(cls, value: str) -> str:
        allowed = {"low", "medium", "high"}
        if value not in allowed:
            raise ValueError(f"surplus_volatility must be one of {sorted(allowed)}")
        return value

    @field_validator("debt_trend")
    @classmethod
    def validate_debt_trend(cls, value: str) -> str:
        allowed = {"growing", "stable", "shrinking"}
        if value not in allowed:
            raise ValueError(f"debt_trend must be one of {sorted(allowed)}")
        return value


class GapItem(BaseModel):
    category: str
    stated: float
    actual: float
    delta_pct: float
    status: str  # "red" | "amber" | "green"

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"red", "amber", "green"}
        if value not in allowed:
            raise ValueError(f"status must be one of {sorted(allowed)}")
        return value


class SavingBreakdown(BaseModel):
    emergency_fund_coverage: float
    savings_consistency: float
    debt_to_income: float
    income_stability: float


class ReadinessReport(BaseModel):
    saving_score: float
    investment_score: float
    saving_breakdown: SavingBreakdown
    behavioral_flags: list[str]
    gap_analysis: list[GapItem]
    months_to_1mo_emergency_fund: float
    months_to_3mo_emergency_fund: float
    investable_surplus: float
    readiness_narrative: str
    investment_narrative: str


class UserProfile(BaseModel):
    session_id: str
    questionnaire: QuestionnaireInput
    behavioral: BehavioralProfile
    readiness: ReadinessReport
    


class RetrievedChunk(BaseModel):
    source: str
    page: Optional[int] = None
    snippet: str


class SavingStrategy(BaseModel):
    summary: str
    priority_goal: str
    monthly_target_saving: float
    emergency_fund_target: float
    debt_paydown_target: float
    action_steps: list[str]
    warnings: list[str]


class InvestmentStrategy(BaseModel):
    readiness_status: str  # "not_ready" | "preparing" | "ready"
    summary: str
    monthly_invest_amount: float
    suggested_etfs: list[str]
    suggested_allocation: dict[str, float]
    action_steps: list[str]
    warnings: list[str]
    market_context: dict


class AIAdviceReport(BaseModel):
    saving_strategy: SavingStrategy
    investment_strategy: Optional[InvestmentStrategy] = None
    sources_used: list[RetrievedChunk]