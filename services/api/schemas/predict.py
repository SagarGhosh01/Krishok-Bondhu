"""
AgriShield AI - Prediction & Diagnostic Response Schemas
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class QualityCheckOut(BaseModel):
    passed: bool
    blur_score: float
    luminance: float
    width: int
    height: int
    defect: Optional[str] = None
    message: str


class AlternativeCandidateOut(BaseModel):
    class_idx: int
    class_name: str
    crop: str
    disease_name: str
    probability: float


class AdvisorySummaryOut(BaseModel):
    language: str
    display_name: str
    description: str
    symptoms: str
    cultural_practices: str
    biological_control: str
    chemical_reference: str
    source_title: str
    source_url: str
    reviewer_name: Optional[str] = None
    review_date: Optional[str] = None


class FoliarSeverityOut(BaseModel):
    severity_percentage: float
    severity_grade: int
    grade_label: str
    projected_yield_loss_pct: str
    lesion_spot_count: int
    contour_image_base64: Optional[str] = None


class PredictionResponse(BaseModel):
    scan_id: str
    state: str  # CONFIDENT, UNCERTAIN, CANNOT_ASSESS
    primary_class: Optional[str] = None
    primary_crop: Optional[str] = None
    primary_disease: Optional[str] = None
    scientific_name: Optional[str] = None
    is_healthy: bool = False
    calibrated_confidence: float
    reliability_score: float
    energy_score: float
    quality: QualityCheckOut
    top_alternatives: List[AlternativeCandidateOut] = []
    advisory: Optional[AdvisorySummaryOut] = None
    severity: Optional[FoliarSeverityOut] = None
    gradcam_url: Optional[str] = None
    gradcam_disclaimer: str
    message: str
    action_guidance: str
    requires_expert_consultation: bool
    model_version: str
