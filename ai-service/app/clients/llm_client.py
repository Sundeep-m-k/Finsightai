"""Binghamton OpenWebUI (Ollama) client. Mirrors the OpenAI chat completions API."""
from __future__ import annotations

import json
import re

import httpx

from app.config import settings


def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 2048,
    model: str | None = None,
) -> str:
    payload = {
        "model": model or settings.binghamton_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            settings.binghamton_url,
            headers={
                "Authorization": f"Bearer {settings.binghamton_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def complete_json(system: str, user: str, *, max_tokens: int = 2048) -> dict:
    """Call the model and parse the response as JSON. Tolerates markdown code blocks."""
    try:
        raw = complete(system=system, user=user, max_tokens=max_tokens)
    except Exception as exc:
        raise RuntimeError(f"API call failed: {exc}") from exc
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Model returned non-JSON: {raw[:200]!r}") from exc
