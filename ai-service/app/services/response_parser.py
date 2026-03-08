"""Parse Claude JSON into InsightResponse. Validate and coerce types."""
from __future__ import annotations

from app.schemas.insight import (
    DEFAULT_DISCLAIMER,
    ActionStep,
    Insight,
    InsightResponse,
)
from app.schemas.sources import Source


def parse_strategy_response(raw: dict) -> InsightResponse:
    insights = []
    for i in raw.get("insights") or []:
        sources = [
            Source(
                title=s.get("title", ""),
                url=s.get("url", ""),
                preview=(s.get("preview") or "")[:300],
                relevance_score=float(s.get("relevance_score", 0)),
                badge_type=s.get("badge_type", "finsight-kb"),
            )
            for s in i.get("sources") or []
        ]
        insights.append(
            Insight(
                recommendation=i.get("recommendation", ""),
                principle=i.get("principle", ""),
                behavioral_flags=list(i.get("behavioral_flags") or []),
                sources=sources,
            )
        )

    action_plan = [
        ActionStep(
            title=s.get("title", ""),
            description=s.get("description", ""),
            time_label=s.get("time_label", ""),
        )
        for s in raw.get("action_plan") or []
    ]

    return InsightResponse(
        insights=insights,
        action_plan=action_plan,
        narrative=raw.get("narrative", ""),
        disclaimer=raw.get("disclaimer", DEFAULT_DISCLAIMER),
    )
