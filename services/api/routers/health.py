"""
AgriShield AI - Health Check & Model Version Info Router
"""

import json
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from sqlalchemy import text
from services.api.core.config import settings
from services.api.database.connection import get_db
from services.api.database.models import ModelVersion
from ml.src.data.classes import CLASS_NAMES, NUM_CLASSES

router = APIRouter(tags=["System Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint verifying DB connectivity and model availability."""
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    model_path = Path(settings.MODEL_DIR) / "model.onnx"
    if not model_path.exists():
        model_path = Path(settings.MODEL_DIR) / "model_int8.onnx"

    return {
        "status": "healthy" if db_ok and model_path.exists() else "degraded",
        "service": "AgriShield AI Backend API",
        "version": settings.VERSION,
        "database_connected": db_ok,
        "model_loaded": model_path.exists(),
        "model_file": model_path.name if model_path.exists() else None,
    }


@router.get("/model-info")
def get_model_info(db: Session = Depends(get_db)):
    """Returns active deployment model metadata, ordered 17 classes, and calibration parameters."""
    meta_path = Path(settings.MODEL_DIR) / "metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback to DB record
    mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    return {
        "model_version": mv.version_str if mv else "1.0.0",
        "backbone": mv.backbone if mv else "mobilenet_v3_large",
        "classes": CLASS_NAMES,
        "num_classes": NUM_CLASSES,
        "temperature": mv.temperature if mv else 1.0,
        "ood_threshold": mv.ood_threshold if mv else -3.3,
    }
