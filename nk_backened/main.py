from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from models import BehavioralProfile, CategoryAggregate, QuestionnaireInput, ReadinessReport, UserProfile

from parser import parse_and_aggregate
from scorer import compute_readiness_report
from session_store import get_session, save_session, update_session
from signals import compute_behavioral_profile
from ai_advisor import generate_full_ai_advice
from rag_store import reindex_knowledge_base
from models import AIAdviceReport


app = FastAPI(title="FinSight AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "FinSight AI backend is running"}

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/rag/reindex")
def rag_reindex():
    try:
        return reindex_knowledge_base()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to rebuild RAG index: {exc}") from exc


@app.post("/ai/full-advice/{session_id}", response_model=AIAdviceReport)
def full_ai_advice(session_id: str) -> AIAdviceReport:
    print("AI advice request started", session_id)

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if "questionnaire" not in session or "behavioral" not in session or "readiness" not in session:
        raise HTTPException(status_code=400, detail="Complete profile not ready. Run onboard, upload, and score first.")

    try:
        print("Building AI advice...")
        advice = generate_full_ai_advice(session)
        print("AI advice built successfully")

        update_session(session_id, "ai_advice", advice.model_dump())
        return advice
    except Exception as exc:
        print("AI advice failed:", exc)
        raise HTTPException(status_code=500, detail=f"Failed to generate AI advice: {exc}") from exc


@app.post("/onboard")
def onboard(questionnaire: QuestionnaireInput) -> dict[str, str]:
    session_id = str(uuid4())

    save_session(
        session_id,
        {
            "session_id": session_id,
            "questionnaire": questionnaire.model_dump(),
        },
    )

    return {"session_id": session_id}


@app.post("/upload/{session_id}", response_model=BehavioralProfile)
async def upload_transactions(
    session_id: str,
    file: UploadFile = File(...),
) -> BehavioralProfile:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if "questionnaire" not in session:
        raise HTTPException(status_code=400, detail="Questionnaire not found for session.")

    try:
        file_bytes = await file.read()
        parsed = parse_and_aggregate(file_bytes=file_bytes, filename=file.filename or "")

        questionnaire = QuestionnaireInput(**session["questionnaire"])
        category_aggregates = parsed["category_aggregates"]
        months_analyzed = parsed["months_analyzed"]

        behavioral = compute_behavioral_profile(
            questionnaire=questionnaire,
            category_aggregates=[
            item if isinstance(item, CategoryAggregate) else CategoryAggregate(**item)
            for item in category_aggregates
        ],
            months_analyzed=months_analyzed,
        )

        update_session(session_id, "behavioral", behavioral.model_dump())
        update_session(session_id, "transactions", parsed["transactions"])

        return behavioral

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {exc}") from exc


@app.post("/score/{session_id}", response_model=ReadinessReport)
def score_session(session_id: str) -> ReadinessReport:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if "questionnaire" not in session:
        raise HTTPException(status_code=400, detail="Questionnaire missing from session.")
    if "behavioral" not in session:
        raise HTTPException(status_code=400, detail="Behavioral profile missing. Upload transactions first.")

    try:
        questionnaire = QuestionnaireInput(**session["questionnaire"])
        behavioral = BehavioralProfile(**session["behavioral"])

        readiness = compute_readiness_report(
            questionnaire=questionnaire,
            behavioral=behavioral,
        )

        update_session(session_id, "readiness", readiness.model_dump())
        return readiness

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute score: {exc}") from exc


@app.get("/profile/{session_id}", response_model=UserProfile)
def get_profile(session_id: str) -> UserProfile:
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    if "questionnaire" not in session:
        raise HTTPException(status_code=400, detail="Questionnaire missing from session.")
    if "behavioral" not in session:
        raise HTTPException(status_code=400, detail="Behavioral profile missing from session.")
    if "readiness" not in session:
        raise HTTPException(status_code=400, detail="Readiness report missing from session.")

    try:
        return UserProfile(
            session_id=session["session_id"],
            questionnaire=QuestionnaireInput(**session["questionnaire"]),
            behavioral=BehavioralProfile(**session["behavioral"]),
            readiness=ReadinessReport(**session["readiness"]),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to build profile: {exc}") from exc