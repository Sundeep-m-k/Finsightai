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

        text = d.page_content[:800]
        parts.append(f"{label}\n{text}")
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
    r = profile.readiness
    b = profile.behavioral
    return (
        f"beginner ETF investing for student "
        f"saving_score {r.saving_score} "
        f"investment_score {r.investment_score} "
        f"risk {q.risk_comfort} "
        f"time_horizon {q.time_horizon} "
        f"volatility {b.surplus_volatility}"
    )


def _investment_mode(readiness: ReadinessReport) -> str:
    if readiness.saving_score < 4:
        return "not_ready"
    if readiness.saving_score < 6:
        return "preparing"
    return "ready"


def generate_saving_strategy(profile: UserProfile):
    chunks = retrieve_chunks(_saving_query(profile), k=2)

    prompt = SAVING_PROMPT.format(
        profile=_serialize_profile(profile),
        retrieved_context=_chunks_to_text(chunks),
    )

    parsed = generate_json(prompt, SAVING_SCHEMA)
    strategy = SavingStrategy(**parsed)
    return strategy, _chunks_to_sources(chunks)


def generate_investment_strategy(profile: UserProfile):
    mode = _investment_mode(profile.readiness)

    if mode == "not_ready":
        strategy = InvestmentStrategy(
            readiness_status="not_ready",
            summary="You are not ready to start investing yet. Build emergency savings and stabilize debt first.",
            monthly_invest_amount=0.0,
            suggested_etfs=[],
            suggested_allocation={},
            action_steps=[
                "Build a starter emergency fund first.",
                "Reduce debt pressure and improve monthly saving consistency.",
                "Reassess investing after cash flow becomes more stable.",
            ],
            warnings=[
                "Investing before your savings foundation is ready increases risk."
            ],
            market_context={},
        )
        return strategy, []

    chunks = retrieve_chunks(_investment_query(profile), k=4)
    raw_market_context = get_investment_market_context(["VTI", "VOO"])
    
    def _compact_market_context(raw_market_context: dict) -> dict:
        compact = {
            "market_status": raw_market_context.get("market_status", {}),
            "symbols": {}
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
                "recommendation_trends": data.get("recommendation_trends", [])[:2],
                "news_headlines": [
                    {
                        "headline": item.get("headline"),
                        "source": item.get("source"),
                        "datetime": item.get("datetime"),
                    }
                    for item in data.get("news", [])[:3]
                ],
            }

        return compact
    
    market_context = _compact_market_context(raw_market_context)

    prompt = INVESTMENT_PROMPT.format(
        profile=_serialize_profile(profile),
        retrieved_context=_chunks_to_text(chunks),
        market_context=json.dumps(market_context, indent=2),
    )

    parsed = generate_json(prompt, INVESTMENT_SCHEMA)
    parsed["readiness_status"] = mode
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

    saving_strategy, saving_sources = generate_saving_strategy(profile)
    investment_strategy, investing_sources = generate_investment_strategy(profile)

    deduped = []
    seen = set()
    for item in saving_sources + investing_sources:
        key = (item.source, item.page, item.snippet[:120])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
            
    print("retrieving saving chunks")
    print("calling gemini for saving strategy")
    print("retrieving investment chunks")
    print("calling finnhub")
    print("calling gemini for investment strategy")

    return AIAdviceReport(
        saving_strategy=saving_strategy,
        investment_strategy=investment_strategy,
        sources_used=deduped,
    )