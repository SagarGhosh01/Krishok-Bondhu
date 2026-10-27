"""
AgriShield AI - Soil Health Diagnostic & Planning Router
Provides soil test evaluations, fertility scoring, amelioration advice, and crop suitability.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from services.api.database.connection import get_db
from services.api.database.models import SoilTestRecord, User
from services.api.routers.auth import get_current_user_optional
from services.api.services.soil_service import soil_service
import json

router = APIRouter(prefix="/soil", tags=["Soil Health & Crop Planning"])


class SoilAnalysisRequest(BaseModel):
    ph: float = Field(..., ge=3.0, le=11.0, description="Soil pH value (3.0 to 11.0)")
    electrical_conductivity: float = Field(..., ge=0.0, le=15.0, description="Electrical conductivity in dS/m")
    organic_carbon_pct: float = Field(..., ge=0.0, le=5.0, description="Organic carbon percentage (0.0 to 5.0%)")
    available_nitrogen: float = Field(..., ge=10.0, le=1500.0, description="Available Nitrogen in kg/ha")
    available_phosphorus: float = Field(..., ge=1.0, le=200.0, description="Available Phosphorus in kg/ha")
    available_potassium: float = Field(..., ge=10.0, le=1000.0, description="Available Potassium in kg/ha")
    farm_id: Optional[str] = Field(None, description="Optional farm ID to associate with record")


@router.post("/analyze")
def analyze_soil_sample(
    payload: SoilAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Evaluates soil parameters according to Soil Health Card guidelines,
    returns fertility score, amelioration guidelines, and crop suitability.
    Optionally saves the record if user is authenticated.
    """
    analysis = soil_service.evaluate_soil_test(
        ph=payload.ph,
        electrical_conductivity=payload.electrical_conductivity,
        organic_carbon_pct=payload.organic_carbon_pct,
        available_nitrogen=payload.available_nitrogen,
        available_phosphorus=payload.available_phosphorus,
        available_potassium=payload.available_potassium,
    )

    record_id = None
    if current_user:
        sample_date = datetime.now().strftime("%Y-%m-%d")
        record = SoilTestRecord(
            user_id=current_user.id,
            farm_id=payload.farm_id,
            sample_date=sample_date,
            ph=payload.ph,
            electrical_conductivity=payload.electrical_conductivity,
            organic_carbon_pct=payload.organic_carbon_pct,
            available_nitrogen=payload.available_nitrogen,
            available_phosphorus=payload.available_phosphorus,
            available_potassium=payload.available_potassium,
            fertility_rating=analysis["overall_rating"],
            recommendations_json=json.dumps(analysis["parameters"]),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        record_id = record.id

    analysis["saved_record_id"] = record_id
    return analysis


@router.get("/benchmarks")
def get_soil_benchmarks():
    """Returns official Soil Health Card benchmark reference ranges."""
    return {
        "parameters": [
            {"parameter": "pH (Reaction)", "unit": "scale", "low": "< 6.5 (Acidic)", "medium": "6.5 - 7.5 (Neutral)", "high": "> 7.5 (Alkaline)"},
            {"parameter": "Electrical Conductivity (EC)", "unit": "dS/m", "normal": "< 1.0 (Non-saline)", "critical": "1.0 - 2.0 (Slight Salinity)", "saline": "> 2.0 (Harmful Salinity)"},
            {"parameter": "Organic Carbon (OC)", "unit": "%", "low": "< 0.50%", "medium": "0.50% - 0.75%", "high": "> 0.75%"},
            {"parameter": "Available Nitrogen (N)", "unit": "kg/ha", "low": "< 280", "medium": "280 - 560", "high": "> 560"},
            {"parameter": "Available Phosphorus (P)", "unit": "kg/ha", "low": "< 10", "medium": "10 - 25", "high": "> 25"},
            {"parameter": "Available Potassium (K)", "unit": "kg/ha", "low": "< 108", "medium": "108 - 280", "high": "> 280"},
        ],
        "source": "Soil Health Card Portal, DAC&FW, Ministry of Agriculture & Farmers Welfare, GoI",
        "url": "https://soilhealth.dac.gov.in/"
    }


@router.get("/records")
def get_user_soil_records(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Returns past soil test submissions for the logged in user."""
    if not current_user:
        return {"records": []}

    records = db.query(SoilTestRecord).filter(SoilTestRecord.user_id == current_user.id).order_by(SoilTestRecord.created_at.desc()).all()
    return {
        "count": len(records),
        "records": [
            {
                "id": r.id,
                "sample_date": r.sample_date,
                "ph": r.ph,
                "electrical_conductivity": r.electrical_conductivity,
                "organic_carbon_pct": r.organic_carbon_pct,
                "available_nitrogen": r.available_nitrogen,
                "available_phosphorus": r.available_phosphorus,
                "available_potassium": r.available_potassium,
                "fertility_rating": r.fertility_rating,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ]
    }
