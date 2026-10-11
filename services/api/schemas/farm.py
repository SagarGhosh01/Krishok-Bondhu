"""
AgriShield AI - Farm Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FarmCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    soil_type: Optional[str] = None
    area_acres: Optional[float] = None
    crops_grown: Optional[str] = "Tomato"


class FarmUpdate(BaseModel):
    name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    soil_type: Optional[str] = None
    area_acres: Optional[float] = None
    crops_grown: Optional[str] = None


class FarmOut(BaseModel):
    id: str
    user_id: str
    name: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    soil_type: Optional[str] = None
    area_acres: Optional[float] = None
    crops_grown: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
