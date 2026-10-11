"""
AgriShield AI - Prediction Router
Handles single image screening uploads, runs multi-stage diagnostics,
and returns calibrated uncertainty, Grad-CAM overlays, and verified agronomy guidance.
"""

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import User
from services.api.routers.auth import get_current_user_optional
from services.api.schemas.predict import PredictionResponse
from services.api.services.prediction_service import PredictionService

router = APIRouter(tags=["Disease Screening"])


@router.post("/predict", response_model=PredictionResponse)
async def predict_crop_disease(
    file: UploadFile = File(...),
    selected_crop: Optional[str] = Form(None),
    language: Optional[str] = Form("en"),
    farm_id: Optional[str] = Form(None),
    client_uuid: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Submits an image of a leaf for disease screening.
    Performs image quality validation, OOD gating, ONNX neural inference,
    calibrated uncertainty calculation, and returns curated agronomy advice.
    """
    # 1. Validate content type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file format '{file.content_type}'. Please upload JPEG, PNG, or WebP images.",
        )

    # 2. Read bytes and check size (< 15MB)
    image_bytes = await file.read()
    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Uploaded file exceeds the maximum allowed 15MB limit.",
        )

    user_id = current_user.id if current_user else None

    # 3. Execute Prediction Pipeline
    prediction_svc = PredictionService.get_instance()
    try:
        response = prediction_svc.predict(
            image_bytes=image_bytes,
            original_filename=file.filename or "upload.jpg",
            db=db,
            user_id=user_id,
            farm_id=farm_id,
            selected_crop=selected_crop,
            language=language or "en",
            client_uuid=client_uuid,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Diagnostic service error: {str(e)}")
