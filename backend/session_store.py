from typing import Any


sessions: dict[str, dict[str, Any]] = {}


def save_session(session_id: str, data: dict[str, Any]) -> None:
    sessions[session_id] = data


def get_session(session_id: str) -> dict[str, Any] | None:
    return sessions.get(session_id)


def update_session(session_id: str, key: str, value: Any) -> None:
    if session_id in sessions:
        sessions[session_id][key] = value