import json

from finhub_client import get_investment_market_context
from gemini_llm import generate_json
from models import (
    AIAdviceReport,
    BehavioralProfile,
    InvestmentStrategy,
    QuestionnaireInput,
    ReadinessReport,
    RetrievedChunk,
    SavingStrategy,
    UserProfile,
)
from prompts import INVESTMENT_PROMPT, SAVING_PROMPT
from rag_store import retrieve_chunks


BLOCKLISTED_ADVICE_SOURCES = {
    "The Total Money Makeover - Dave Ramsey.pdf",
}


SAVING_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "priority_goal": {"type": "string"},
        "monthly_target_saving": {"type": "number"},
        "emergency_fund_target": {"type": "number"},
        "debt_paydown_target": {"type": "number"},
        "action_steps": {"type": "array", "items": {"type": "string"}},
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "summary",
        "priority_goal",
        "monthly_target_saving",
        "emergency_fund_target",
        "debt_paydown_target",
        "action_steps",
        "warnings",
    ],
}

INVESTMENT_SCHEMA = {
    "type": "object",
    "properties": {
        "readiness_status": {"type": "string"},
        "summary": {"type": "string"},
        "monthly_invest_amount": {"type": "number"},
        "suggested_etfs": {"type": "array", "items": {"type": "string"}},
        "suggested_allocation": {
            "type": "object",
            "additionalProperties": {"type": "number"},
        },
        "action_steps": {"type": "array", "items": {"type": "string"}},
        "warnings": {"type": "array", "items": {"type": "string"}},
        "market_context": {"type": "object"},
    },
    "required": [
        "readiness_status",
        "summary",
        "monthly_invest_amount",
        "suggested_etfs",
        "suggested_allocation",
        "action_steps",
        "warnings",
        "market_context",
    ],
}


def _serialize_profile(profile: UserProfile) -> str:
    return json.dumps(profile.model_dump(), indent=2)


def _chunks_to_text(chunks) -> str:
    parts = []
    for d in chunks:
        source = d.metadata.get("source", "unknown")
        page = d.metadata.get("page")
        label = f"[source={source}"
        if page is not None:
            label += f", page={page}"
        label += "]"
        parts.append(f"{label}\n{d.page_content[:800]}")
    return "\n\n---\n\n".join(parts)


def _chunks_to_sources(chunks) -> list[RetrievedChunk]:
    items = []
    for d in chunks:
        items.append(
            RetrievedChunk(
                source=d.metadata.get("source", "unknown"),
                page=d.metadata.get("page"),
                snippet=d.page_content[:400],
            )
        )
    return items


def _prioritize_chunks(chunks, max_items: int = 4):
    filtered = [
        c for c in chunks
        if c.metadata.get("source") not in BLOCKLISTED_ADVICE_SOURCES
    ]
    internal = [c for c in filtered if c.metadata.get("doc_type") == "internal"]
    pdfs = [c for c in filtered if c.metadata.get("doc_type") == "pdf"]
    return (internal + pdfs)[:max_items]


def _saving_query(profile: UserProfile) -> str:
    b = profile.behavioral
    r = profile.readiness
    return (
        f"student saving strategy emergency fund debt overspending "
        f"saving_score {r.saving_score} "
        f"behavioral_flags {' '.join(b.behavioral_flags)} "
        f"overspend_categories {' '.join(b.top_overspend_categories)}"
    )


def _investment_query(profile: UserProfile) -> str:
    q = profile.questionnaire
    return (
        f"beginner student investing broad market ETF "
        f"risk comfort {q.risk_comfort} "
        f"time horizon {q.time_horizon} "
        f"low cost diversified index fund "
        f"when to delay investing until emergency fund is stable"
    )


def _investment_mode(readiness: ReadinessReport) -> str:
    if readiness.saving_score < 4:
        return "not_ready"
    if readiness.saving_score < 6:
        return "preparing"
    return "ready"


def _monthly_expenses(profile: UserProfile) -> float:
    total = 0.0
    for agg in profile.behavioral.category_aggregates:
        if agg.category != "income":
            total += agg.monthly_avg
    return round(total, 2)


def _emergency_fund_target(profile: UserProfile) -> float:
    return round(_monthly_expenses(profile), 2)


def _priority_goal(profile: UserProfile) -> str:
    b = profile.behavioral
    if "emergency_fund_critical" in b.behavioral_flags:
        return "Build starter emergency fund"
    if "high_debt_to_income" in b.behavioral_flags:
        return "Reduce debt pressure"
    if b.top_overspend_categories:
        return f"Reduce {b.top_overspend_categories[0]} overspending"
    return "Improve savings consistency"


def _safe_saving_target(profile: UserProfile) -> float:
    surplus = max(0.0, profile.behavioral.monthly_surplus_avg)
    if surplus <= 0:
        return 50.0
    return round(min(300.0, max(50.0, surplus * 0.4)), 2)


def _safe_debt_target(profile: UserProfile) -> float:
    surplus = max(0.0, profile.behavioral.monthly_surplus_avg)
    cc_balance = profile.questionnaire.credit_card_balance
    if cc_balance <= 0:
        return 0.0
    if surplus <= 0:
        return 50.0
    return round(min(250.0, max(50.0, surplus * 0.3)), 2)


def _compact_market_context(raw_market_context: dict) -> dict:
    compact = {
        "market_status": raw_market_context.get("market_status", {}),
        "symbols": {},
    }

    for symbol, data in raw_market_context.get("symbols", {}).items():
        compact["symbols"][symbol] = {
            "quote": data.get("quote", {}),
            "profile": {
                "name": data.get("profile", {}).get("name"),
                "ticker": data.get("profile", {}).get("ticker"),
                "finnhubIndustry": data.get("profile", {}).get("finnhubIndustry"),
                "marketCapitalization": data.get("profile", {}).get("marketCapitalization"),
            },
            "recommendation_trends": data.get("recommendation_trends", [])[:1],
            "news_headlines": [
                {
                    "headline": item.get("headline"),
                    "source": item.get("source"),
                }
                for item in data.get("news", [])[:2]
            ],
        }

    return compact


def generate_saving_strategy(profile: UserProfile):
    print("retrieving saving chunks")
    chunks = _prioritize_chunks(retrieve_chunks(_saving_query(profile), k=8), max_items=4)
    print("saving chunks retrieved")

    monthly_target_saving = _safe_saving_target(profile)
    debt_paydown_target = _safe_debt_target(profile)
    emergency_fund_target = _emergency_fund_target(profile)
    priority_goal = _priority_goal(profile)

    prompt = SAVING_PROMPT.format(
        profile=_serialize_profile(profile),
        retrieved_context=_chunks_to_text(chunks),
        monthly_target_saving=monthly_target_saving,
        debt_paydown_target=debt_paydown_target,
        emergency_fund_target=emergency_fund_target,
        priority_goal=priority_goal,
    )

    print("calling Gemini for saving strategy")
    parsed = generate_json(prompt, SAVING_SCHEMA)

    parsed["monthly_target_saving"] = monthly_target_saving
    parsed["debt_paydown_target"] = debt_paydown_target
    parsed["emergency_fund_target"] = emergency_fund_target
    parsed["priority_goal"] = priority_goal

    strategy = SavingStrategy(**parsed)
    return strategy, _chunks_to_sources(chunks)


def generate_investment_strategy(profile: UserProfile):
    mode = _investment_mode(profile.readiness)

    if mode == "not_ready":
        strategy = InvestmentStrategy(
            readiness_status="not_ready",
            summary="You are not ready to start investing yet. Build emergency savings and reduce financial instability first.",
            monthly_invest_amount=0.0,
            suggested_etfs=[],
            suggested_allocation={},
            action_steps=[
                "Build a starter emergency fund first.",
                "Reduce debt pressure and improve monthly saving consistency.",
                "Reassess investing after stabilizing cash flow.",
            ],
            warnings=["Investing now would add risk before your savings foundation is ready."],
            market_context={},
        )
        return strategy, []

    print("retrieving investment chunks")
    chunks = _prioritize_chunks(retrieve_chunks(_investment_query(profile), k=8), max_items=4)
    print("investment chunks retrieved")

    print("fetching Finnhub market context")
    raw_market_context = get_investment_market_context(["VTI", "VOO"])
    market_context = _compact_market_context(raw_market_context)
    print("Finnhub market context fetched")

    if mode == "preparing":
        fixed_amount = 0.0
        fixed_etfs = ["VTI"]
        fixed_allocation = {"VTI": 100.0}
    else:
        investable = max(0.0, profile.readiness.investable_surplus)
        fixed_amount = round(min(200.0, max(25.0, investable * 0.4)), 2)
        fixed_etfs = ["VTI", "VOO"]
        fixed_allocation = {"VTI": 70.0, "VOO": 30.0}

    prompt = INVESTMENT_PROMPT.format(
        profile=_serialize_profile(profile),
        retrieved_context=_chunks_to_text(chunks),
        market_context=json.dumps(market_context, indent=2),
        readiness_status=mode,
        monthly_invest_amount=fixed_amount,
        suggested_etfs=json.dumps(fixed_etfs),
        suggested_allocation=json.dumps(fixed_allocation),
    )

    print("calling Gemini for investment strategy")
    parsed = generate_json(prompt, INVESTMENT_SCHEMA)

    parsed["readiness_status"] = mode
    parsed["monthly_invest_amount"] = fixed_amount
    parsed["suggested_etfs"] = fixed_etfs
    parsed["suggested_allocation"] = fixed_allocation
    parsed["market_context"] = market_context

    strategy = InvestmentStrategy(**parsed)
    return strategy, _chunks_to_sources(chunks)


def generate_full_ai_advice(session_data: dict) -> AIAdviceReport:
    profile = UserProfile(
        session_id=session_data["session_id"],
        questionnaire=QuestionnaireInput(**session_data["questionnaire"]),
        behavioral=BehavioralProfile(**session_data["behavioral"]),
        readiness=ReadinessReport(**session_data["readiness"]),
    )

    print("starting saving strategy generation")
    saving_strategy, saving_sources = generate_saving_strategy(profile)
    print("saving strategy generated")

    print("starting investment strategy generation")
    investment_strategy, investing_sources = generate_investment_strategy(profile)
    print("investment strategy generated")

    deduped = []
    seen = set()
    for item in saving_sources + investing_sources:
        key = (item.source, item.page, item.snippet[:120])
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return AIAdviceReport(
        saving_strategy=saving_strategy,
        investment_strategy=investment_strategy,
        sources_used=deduped,
    )