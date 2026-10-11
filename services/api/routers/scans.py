"""
AgriShield AI - Scans & Diagnostic History Router
Enforces strict tenant isolation: users can only view their own scan records.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import User, Scan, Prediction
from services.api.routers.auth import get_current_user
from services.api.schemas.scan import ScanOut, ScanListResponse
from services.api.schemas.predict import PredictionResponse, QualityCheckOut, AlternativeCandidateOut

router = APIRouter(prefix="/scans", tags=["Scan History"])


@router.get("", response_model=ScanListResponse)
def list_user_scans(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    crop: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists scan history belonging exclusively to current user with pagination."""
    query = db.query(Scan).filter(Scan.user_id == current_user.id)

    if crop:
        query = query.join(Prediction).filter(Prediction.crop.ilike(f"%{crop}%"))

    total = query.count()
    scans = (
        query.order_by(Scan.created_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    items = []
    for s in scans:
        pred_out = None
        if s.prediction:
            pred_out = PredictionResponse(
                scan_id=s.id,
                state=s.prediction.diagnostic_state,
                primary_class=s.prediction.predicted_class,
                primary_crop=s.prediction.crop,
                primary_disease=s.prediction.predicted_class,
                calibrated_confidence=s.prediction.calibrated_confidence,
                reliability_score=s.prediction.reliability_score,
                energy_score=0.0,
                quality=QualityCheckOut(
                    passed=True,
                    blur_score=s.blur_score,
                    luminance=s.luminance,
                    width=s.width,
                    height=s.height,
                    defect=None,
                    message="OK",
                ),
                top_alternatives=[],
                gradcam_url=s.prediction.gradcam_path,
                gradcam_disclaimer="Screening visual aid only.",
                message="Diagnosis retrieved from history.",
                action_guidance="Consult extension officer.",
                requires_expert_consultation=False,
                model_version="1.0.0",
            )

        items.append(
            ScanOut(
                id=s.id,
                client_uuid=s.client_uuid,
                user_id=s.user_id,
                farm_id=s.farm_id,
                image_url=s.image_path,
                original_filename=s.original_filename,
                width=s.width,
                height=s.height,
                blur_score=s.blur_score,
                luminance=s.luminance,
                is_offline_captured=s.is_offline_captured,
                created_at=s.created_at,
                prediction=pred_out,
            )
        )

    return ScanListResponse(items=items, total=total, page=page, size=size)


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan_details(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves single scan details with strict cross-user ownership verification."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan record not found.")

    # Strict authorization ownership check
    if scan.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view other users' scans.",
        )

    pred_out = None
    if scan.prediction:
        pred_out = PredictionResponse(
            scan_id=scan.id,
            state=scan.prediction.diagnostic_state,
            primary_class=scan.prediction.predicted_class,
            primary_crop=scan.prediction.crop,
            primary_disease=scan.prediction.predicted_class,
            calibrated_confidence=scan.prediction.calibrated_confidence,
            reliability_score=scan.prediction.reliability_score,
            energy_score=0.0,
            quality=QualityCheckOut(
                passed=True,
                blur_score=scan.blur_score,
                luminance=scan.luminance,
                width=scan.width,
                height=scan.height,
                defect=None,
                message="OK",
            ),
            top_alternatives=[],
            gradcam_url=scan.prediction.gradcam_path,
            gradcam_disclaimer="Screening visual aid only.",
            message="Diagnosis retrieved from history.",
            action_guidance="Consult extension officer.",
            requires_expert_consultation=False,
            model_version="1.0.0",
        )

    return ScanOut(
        id=scan.id,
        client_uuid=scan.client_uuid,
        user_id=scan.user_id,
        farm_id=scan.farm_id,
        image_url=scan.image_path,
        original_filename=scan.original_filename,
        width=scan.width,
        height=scan.height,
        blur_score=scan.blur_score,
        luminance=scan.luminance,
        is_offline_captured=scan.is_offline_captured,
        created_at=scan.created_at,
        prediction=pred_out,
    )
