"""
AgriShield AI - Crop Yield Forecasting API Router
Provides empirical yield forecasts, historical statistics lookups, and district benchmarks.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import CropYieldRecord
from services.api.services.yield_service import yield_service

router = APIRouter(prefix="/yield", tags=["Yield Forecasting"])


class YieldPredictionRequest(BaseModel):
    state: str = Field(default="West Bengal", description="State name")
    district: str = Field(..., description="District name (e.g., 'Purba Bardhaman', 'Hooghly')")
    crop: str = Field(..., description="Crop name (e.g., 'Potato', 'Rice', 'Tomato', 'Maize')")
    season: str = Field(..., description="Cropping season ('Kharif', 'Rabi', 'Summer')")
    area_hectares: float = Field(..., gt=0.0, le=10000.0, description="Cultivated area in hectares")
    rainfall_mm: Optional[float] = Field(None, ge=0.0, le=4000.0, description="Optional cumulative seasonal rainfall in mm")
    mean_temperature_celsius: Optional[float] = Field(None, ge=0.0, le=55.0, description="Optional mean temperature in °C")
    irrigation_coverage_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional percentage of irrigated area")


@router.post("/predict")
def predict_crop_yield(payload: YieldPredictionRequest):
    """
    Computes empirical yield prediction (t/ha) and total production (tonnes)
    with an 80% prediction interval and historical comparisons.
    """
    valid_crops = ["Potato", "Rice", "Tomato", "Maize", "Wheat", "Jute", "Mustard"]
    if payload.crop not in valid_crops:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported crop '{payload.crop}'. Supported crops: {valid_crops}"
        )

    result = yield_service.predict_yield(
        district=payload.district,
        crop=payload.crop,
        season=payload.season,
        area_hectares=payload.area_hectares,
        rainfall_mm=payload.rainfall_mm,
        mean_temperature_celsius=payload.mean_temperature_celsius,
        irrigation_coverage_pct=payload.irrigation_coverage_pct,
    )
    return result


@router.get("/historical")
def get_historical_yield_data(
    district: Optional[str] = Query(None, description="Filter by district"),
    crop: Optional[str] = Query(None, description="Filter by crop"),
    season: Optional[str] = Query(None, description="Filter by season"),
    crop_year: Optional[int] = Query(None, description="Filter by year"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Queries verified historical district-level crop area, production, and yields
    ingested from UPAg and DES.
    """
    query = db.query(CropYieldRecord)
    if district:
        query = query.filter(CropYieldRecord.district.ilike(f"%{district}%"))
    if crop:
        query = query.filter(CropYieldRecord.crop.ilike(f"%{crop}%"))
    if season:
        query = query.filter(CropYieldRecord.season == season)
    if crop_year:
        query = query.filter(CropYieldRecord.crop_year == crop_year)

    records = query.order_by(CropYieldRecord.crop_year.desc()).limit(limit).all()

    return {
        "count": len(records),
        "source": "UPAg & Directorate of Economics and Statistics, MoA&FW, GoI",
        "records": [
            {
                "state": r.state,
                "district": r.district,
                "crop_year": r.crop_year,
                "season": r.season,
                "crop": r.crop,
                "area_hectares": r.area_hectares,
                "production_tonnes": r.production_tonnes,
                "yield_tonnes_per_hectare": r.yield_tonnes_per_hectare,
                "rainfall_mm": r.rainfall_mm,
                "mean_temperature_celsius": r.mean_temperature_celsius,
                "irrigation_coverage_pct": r.irrigation_coverage_pct,
                "source_name": r.source_name,
            }
            for r in records
        ],
    }


@router.get("/crops")
def get_supported_crops():
    """Returns list of supported crops, typical seasons, and historical mean yields."""
    return {
        "crops": [
            {"name": "Potato", "seasons": ["Rabi"], "typical_yield_range_t_ha": "20.0 - 32.0", "primary_districts": ["Hooghly", "Purba Bardhaman", "Bankura", "Birbhum"]},
            {"name": "Rice", "seasons": ["Kharif", "Rabi", "Summer"], "typical_yield_range_t_ha": "2.5 - 4.2", "primary_districts": ["All West Bengal Districts"]},
            {"name": "Tomato", "seasons": ["Rabi", "Summer"], "typical_yield_range_t_ha": "14.0 - 24.0", "primary_districts": ["Hooghly", "Nadia", "North 24 Parganas"]},
            {"name": "Maize", "seasons": ["Kharif", "Rabi"], "typical_yield_range_t_ha": "3.5 - 5.5", "primary_districts": ["Malda", "Uttar Dinajpur", "Dakshin Dinajpur"]},
            {"name": "Wheat", "seasons": ["Rabi"], "typical_yield_range_t_ha": "2.2 - 3.4", "primary_districts": ["Murshidabad", "Nadia", "Malda"]},
            {"name": "Jute", "seasons": ["Kharif"], "typical_yield_range_t_ha": "2.2 - 3.2", "primary_districts": ["Nadia", "Murshidabad", "North 24 Parganas"]},
            {"name": "Mustard", "seasons": ["Rabi"], "typical_yield_range_t_ha": "1.0 - 1.6", "primary_districts": ["Nadia", "Murshidabad", "Birbhum"]},
        ]
    }


@router.get("/districts")
def get_supported_districts():
    """Returns list of West Bengal agricultural districts in pilot scope."""
    from ml.src.data.yield_dataset_generator import WEST_BENGAL_DISTRICTS
    return {"state": "West Bengal", "districts": WEST_BENGAL_DISTRICTS}
