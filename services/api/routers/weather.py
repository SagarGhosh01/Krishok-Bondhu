"""
AgriShield AI - Weather Intelligence & Agro-Risk Router
Provides real-time observations, 5-day agro-meteorological forecasts, and disease risk metrics.
"""

from typing import Optional
from fastapi import APIRouter, Query
from services.api.services.weather_service import weather_service

router = APIRouter(prefix="/weather", tags=["Weather Intelligence"])


@router.get("/current")
def get_current_weather(
    district: str = Query("Purba Bardhaman", description="District name"),
    lat: Optional[float] = Query(None, description="Optional latitude"),
    lon: Optional[float] = Query(None, description="Optional longitude"),
):
    """Returns current weather observation for district or coordinate point."""
    data = weather_service.fetch_weather(district=district, lat=lat, lon=lon)
    return {
        "district": data["district"],
        "observation_time": data["observation_time"],
        "source": data["source"],
        "is_live": data["is_live_observation"],
        "current": data["current"],
        "data_freshness_badge": data["data_freshness_badge"],
    }


@router.get("/forecast")
def get_weather_forecast(
    district: str = Query("Purba Bardhaman", description="District name"),
    lat: Optional[float] = Query(None, description="Optional latitude"),
    lon: Optional[float] = Query(None, description="Optional longitude"),
):
    """Returns 5-day agro-meteorological forecast and environmental risks."""
    data = weather_service.fetch_weather(district=district, lat=lat, lon=lon)
    return {
        "district": data["district"],
        "observation_time": data["observation_time"],
        "source": data["source"],
        "is_live": data["is_live_observation"],
        "current": data["current"],
        "forecast_5_days": data["forecast_5_days"],
        "agro_risks": data["agro_risks"],
    }


@router.get("/agro-risk")
def get_agro_risk_indicators(
    district: str = Query("Purba Bardhaman", description="District name"),
):
    """Returns disease epidemiological risk (Wallin's BSV) and weather stress alerts."""
    data = weather_service.fetch_weather(district=district)
    return {
        "district": data["district"],
        "agro_risks": data["agro_risks"],
        "source": data["source"],
        "observation_time": data["observation_time"],
    }
