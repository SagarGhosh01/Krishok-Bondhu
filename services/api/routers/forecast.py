"""
AgriShield AI - Epidemiological Micro-Climate Forecast Router
Exposes Wallin Blight Severity Value calculations and 7-day disease risk trajectories.
"""

from fastapi import APIRouter, Query
from typing import Dict, Any
from services.api.services.epidemiology import generate_epidemiological_forecast

router = APIRouter(prefix="/forecast", tags=["Epidemiological Forecast"])


@router.get("/risk")
async def get_disease_forecast(
    crop: str = Query("Tomato", description="Crop name (Tomato, Potato, Corn)"),
    disease: str = Query("Early Blight", description="Suspected or diagnosed disease"),
    temp_c: float = Query(24.5, ge=0.0, le=50.0, description="Ambient air temperature in Celsius"),
    rh_pct: float = Query(85.0, ge=10.0, le=100.0, description="Relative humidity percentage"),
    rainfall_mm: float = Query(3.5, ge=0.0, le=200.0, description="Recent 24h rainfall in mm")
) -> Dict[str, Any]:
    """
    Computes Wallin Blight Severity Values and returns a 7-day spore germination trajectory.
    """
    return generate_epidemiological_forecast(
        crop=crop,
        disease=disease,
        current_temp=temp_c,
        current_rh=rh_pct,
        rainfall_mm=rainfall_mm
    )
