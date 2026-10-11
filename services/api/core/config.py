"""
AgriShield AI - Backend Configuration Settings
Loads environment variables using Pydantic Settings with secure production defaults.
"""

from typing import List
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "AgriShield AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server & Networking
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Security
    SECRET_KEY: str = "agrishield-secure-secret-key-btech-final-year-project-2026-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str = "sqlite:///./services/api/agrishield.db"

    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "services" / "api" / "uploads"
    MODEL_DIR: Path = BASE_DIR / "ml" / "artifacts" / "deployed"

    # ML Inference Settings
    DEFAULT_BACKBONE: str = "mobilenet_v3_large"
    CONFIDENCE_THRESHOLD: float = 0.65
    UNCERTAINTY_FLOOR: float = 0.25
    BLUR_THRESHOLD: float = 80.0
    MIN_LUMINANCE: float = 35.0
    MAX_LUMINANCE: float = 230.0

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
