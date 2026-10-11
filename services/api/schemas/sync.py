"""
AgriShield AI - Offline Sync & Feedback Schemas
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class OfflineScanSyncItem(BaseModel):
    client_uuid: str
    farm_id: Optional[str] = None
    created_at: datetime
    image_base64: str
    filename: Optional[str] = "offline_capture.jpg"
    selected_crop: Optional[str] = None
    client_predicted_class: Optional[str] = None
    client_confidence: Optional[float] = None


class SyncBatchRequest(BaseModel):
    items: List[OfflineScanSyncItem] = Field(..., max_length=50)


class SyncItemStatus(BaseModel):
    client_uuid: str
    scan_id: Optional[str] = None
    status: str  # synchronized, duplicate_skipped, error
    message: str


class SyncBatchResponse(BaseModel):
    total_received: int
    synchronized_count: int
    duplicate_count: int
    results: List[SyncItemStatus]


class FeedbackCreate(BaseModel):
    prediction_id: str
    reported_correct: bool
    suggested_class: Optional[str] = None
    comments: Optional[str] = None


class FeedbackOut(BaseModel):
    id: str
    prediction_id: str
    reported_correct: bool
    suggested_class: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
