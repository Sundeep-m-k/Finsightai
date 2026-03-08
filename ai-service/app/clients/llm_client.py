"""Claude API client. Structured JSON for strategy, plain text for chat."""
from __future__ import annotations

import json
import re

import anthropic
from anthropic import Anthropic

from app.config import settings


def _client() -> Anthropic:
    return Anthropic(api_key=settings.anthropic_api_key or "not-set")


def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 2048,
    model: str | None = None,
) -> str:
    model = model or settings.claude_model
    c = _client()
    msg = c.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = msg.content[0].text if msg.content else ""
    return text.strip()


def complete_json(system: str, user: str, *, max_tokens: int = 2048) -> dict:
    """Call Claude and parse response as JSON. Tolerates markdown code block."""
    raw = complete(system=system, user=user, max_tokens=max_tokens)
    # Strip optional ```json ... ```
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)
