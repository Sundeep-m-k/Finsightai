"""In-memory session store. session_id -> SessionData."""
from __future__ import annotations

import uuid
from typing import Any

from app.models import QuestionnaireSummary, SessionData, Transaction, UserProfile


_store: dict[str, dict[str, Any]] = {}


def create_session() -> str:
    sid = str(uuid.uuid4())
    _store[sid] = {"questionnaire": None, "transactions": [], "profile": None}
    return sid


def get_session(session_id: str) -> SessionData | None:
    raw = _store.get(session_id)
    if not raw:
        return None
    return SessionData(
        questionnaire=raw.get("questionnaire"),
        transactions=[Transaction(**t) if isinstance(t, dict) else t for t in raw.get("transactions", [])],
        profile=UserProfile(**raw["profile"]) if raw.get("profile") else None,
    )


def set_questionnaire(session_id: str, questionnaire: QuestionnaireSummary) -> None:
    if session_id not in _store:
        _store[session_id] = {"questionnaire": None, "transactions": [], "profile": None}
    _store[session_id]["questionnaire"] = questionnaire.model_dump()


def set_transactions(session_id: str, transactions: list[Transaction]) -> None:
    if session_id not in _store:
        _store[session_id] = {"questionnaire": None, "transactions": [], "profile": None}
    _store[session_id]["transactions"] = [t.model_dump() for t in transactions]


def set_profile(session_id: str, profile: UserProfile) -> None:
    if session_id not in _store:
        _store[session_id] = {"questionnaire": None, "transactions": [], "profile": None}
    _store[session_id]["profile"] = profile.model_dump()


def ensure_session(session_id: str | None) -> str:
    if session_id and session_id in _store:
        return session_id
    return create_session()
