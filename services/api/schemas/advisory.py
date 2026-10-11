"""
AgriShield AI - Disease Library & Advisory Schemas
"""

from typing import List, Optional
from pydantic import BaseModel


class DiseaseTranslationOut(BaseModel):
    language: str
    display_name: str
    description: str
    symptoms: str

    class Config:
        from_attributes = True


class AdvisoryOut(BaseModel):
    language: str
    cultural_practices: str
    biological_control: str
    chemical_reference: str
    source_title: str
    source_url: str
    editorial_status: str
    reviewer_name: Optional[str] = None
    review_date: Optional[str] = None

    class Config:
        from_attributes = True


class DiseaseDetailOut(BaseModel):
    id: str
    class_key: str
    crop: str
    scientific_name: str
    pathogen_type: str
    is_healthy: bool
    translations: List[DiseaseTranslationOut] = []
    advisories: List[AdvisoryOut] = []

    class Config:
        from_attributes = True
