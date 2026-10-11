"""
AgriShield AI - FastAPI Main Application Server
Entrypoint for the crop disease screening and agronomy advisory backend.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from services.api.core.config import settings
from services.api.database.connection import Base, engine, SessionLocal
from services.api.database.seed import seed_database
from services.api.routers import auth, predict, scans, farms, diseases, sync, feedback, health, assistant, forecast, outbreak


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure upload dir and database tables exist, seed initial data
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    # Seed initial taxonomy and admin/farmer demo accounts if not already seeded
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    yield
    # Shutdown logic (if any)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Minded, Research-Oriented Crop Disease Screening & Advisory Platform for Farmers.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static media mount for image uploads and Grad-CAM overlays
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include Routers under /api/v1
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(predict.router, prefix=settings.API_V1_STR)
app.include_router(scans.router, prefix=settings.API_V1_STR)
app.include_router(farms.router, prefix=settings.API_V1_STR)
app.include_router(diseases.router, prefix=settings.API_V1_STR)
app.include_router(sync.router, prefix=settings.API_V1_STR)
app.include_router(feedback.router, prefix=settings.API_V1_STR)
app.include_router(assistant.router, prefix=settings.API_V1_STR)
app.include_router(forecast.router, prefix=settings.API_V1_STR)
app.include_router(outbreak.router, prefix=settings.API_V1_STR)

# Direct root health endpoint
app.include_router(health.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to AgriShield AI API",
        "docs": "/docs",
        "health": "/health",
        "version": settings.VERSION,
    }
