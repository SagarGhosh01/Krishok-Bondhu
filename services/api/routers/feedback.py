"""
AgriShield AI - User Feedback & Model Diagnostic Corrections Router
Enables farmers to flag incorrect screening classifications for model retraining.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import User, Prediction, Feedback
from services.api.routers.auth import get_current_user_optional, get_current_user
from services.api.schemas.sync import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["Prediction Feedback"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    fb_in: FeedbackCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Submits feedback on a specific prediction (e.g. Report Incorrect Diagnosis)."""
    prediction = db.query(Prediction).filter(Prediction.id == fb_in.prediction_id).first()
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found.")

    user_id = current_user.id if current_user else None

    fb = Feedback(
        prediction_id=fb_in.prediction_id,
        user_id=user_id,
        reported_correct=fb_in.reported_correct,
        suggested_class=fb_in.suggested_class,
        comments=fb_in.comments,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    return FeedbackOut.model_validate(fb)


@router.get("", response_model=List[FeedbackOut])
def list_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists submitted prediction feedback for experts and administrators."""
    if current_user.role not in ["admin", "expert"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or Expert access required.")

    items = db.query(Feedback).order_by(Feedback.created_at.desc()).limit(100).all()
    return [FeedbackOut.model_validate(i) for i in items]
