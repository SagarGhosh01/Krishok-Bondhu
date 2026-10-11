"""
AgriShield AI - Scan & Scan History Schemas
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from services.api.schemas.predict import PredictionResponse


class ScanOut(BaseModel):
    id: str
    client_uuid: Optional[str] = None
    user_id: Optional[str] = None
    farm_id: Optional[str] = None
    image_url: str
    original_filename: str
    width: int
    height: int
    blur_score: float
    luminance: float
    is_offline_captured: bool
    created_at: datetime
    prediction: Optional[PredictionResponse] = None

    class Config:
        from_attributes = True


class ScanListResponse(BaseModel):
    items: List[ScanOut]
    total: int
    page: int
    size: int
