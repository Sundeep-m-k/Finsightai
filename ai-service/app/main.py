"""FinSight AI service — strategy, chat, market. Person 3."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, market, strategy


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm FAISS index + embedding model so first user request is fast
    import asyncio
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _warmup)
    yield


def _warmup() -> None:
    try:
        from app.rag.retriever import warmup
        warmup()
    except Exception:
        pass  # warmup failure must not prevent startup


app = FastAPI(
    title="FinSight AI Service",
    description="RAG, strategy engine, chat, market data. Person 3.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(strategy.router, prefix="/strategy", tags=["strategy"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(market.router, prefix="/market", tags=["market"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}
