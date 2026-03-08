"""FinSight Backend — Person 2. Onboarding, upload, profile."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, onboard, profile, upload

app = FastAPI(
    title="FinSight Backend",
    description="Data engine: onboarding, upload, signals, scorer. Person 2.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(onboard.router, tags=["onboard"])
app.include_router(upload.router, tags=["upload"])
app.include_router(profile.router, tags=["profile"])


@app.get("/")
def root():
    return {"service": "finsight-backend", "docs": "/docs"}
