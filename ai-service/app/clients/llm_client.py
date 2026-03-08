"""Gemini API client. Structured JSON for strategy, plain text for chat."""
from __future__ import annotations

import json
import re

import google.generativeai as genai

from app.config import settings


def _model(system: str, model_name: str) -> genai.GenerativeModel:
    genai.configure(api_key=settings.gemini_api_key)
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system,
    )


def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 2048,
    model: str | None = None,
) -> str:
    model_name = model or settings.gemini_model
    m = _model(system, model_name)
    response = m.generate_content(
        user,
        generation_config=genai.types.GenerationConfig(max_output_tokens=max_tokens),
    )
    return response.text.strip() if response.text else ""


def complete_json(system: str, user: str, *, max_tokens: int = 2048) -> dict:
    """Call Gemini and parse response as JSON. Tolerates markdown code block."""
    raw = complete(system=system, user=user, max_tokens=max_tokens)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)
