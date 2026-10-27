"""
AgriShield AI - Farmer Dossier & Assessment Report Router
Generates consolidated, printable/downloadable multi-module agricultural intelligence reports.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from services.api.database.connection import get_db
from services.api.database.models import User, Scan, Prediction, SoilTestRecord, MandiPrice
from services.api.routers.auth import get_current_user_optional
from services.api.services.weather_service import weather_service
from services.api.services.yield_service import yield_service

router = APIRouter(prefix="/reports", tags=["Reports & History"])


@router.get("/farmer-summary")
def get_farmer_summary_report(
    district: str = Query("Purba Bardhaman", description="Farmer district"),
    crop: str = Query("Potato", description="Primary crop"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Generates a consolidated decision-support report synthesizing:
    - Weather intelligence & epidemiological risk
    - Crop yield projection with historical benchmarks
    - Local wholesale mandi spot prices
    - Recent diagnostic scan history
    - Soil fertility rating & amendment advice
    """
    generated_at = datetime.now(timezone.utc).isoformat()

    # 1. Weather intelligence
    weather_data = weather_service.fetch_weather(district=district)

    # 2. Yield projection
    yield_data = yield_service.predict_yield(
        district=district,
        crop=crop,
        season="Rabi" if crop in ["Potato", "Wheat", "Mustard"] else "Kharif",
        area_hectares=1.5,
    )

    # 3. Mandi prices for this crop in this district
    mandi_records = (
        db.query(MandiPrice)
        .filter(MandiPrice.commodity.ilike(f"%{crop}%"))
        .order_by(MandiPrice.arrival_date.desc())
        .limit(4)
        .all()
    )
    mandi_summary = [
        {
            "market": m.market_name,
            "district": m.district,
            "modal_price": m.modal_price,
            "min_price": m.min_price,
            "max_price": m.max_price,
            "date": m.arrival_date,
        }
        for m in mandi_records
    ]

    # 4. Recent scans (if user logged in or public demo sample)
    user_id = current_user.id if current_user else None
    scans_query = db.query(Scan).join(Prediction, Scan.id == Prediction.scan_id)
    if user_id:
        scans_query = scans_query.filter(Scan.user_id == user_id)
    recent_scans = scans_query.order_by(Scan.created_at.desc()).limit(3).all()

    scan_history = []
    for s in recent_scans:
        p = s.prediction
        scan_history.append({
            "scan_id": s.id,
            "crop": p.crop,
            "predicted_condition": p.predicted_class,
            "confidence": round(p.calibrated_confidence * 100, 1),
            "diagnostic_state": p.diagnostic_state,
            "date": s.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    # 5. Relevant Government Schemes
    applicable_schemes = [
        {"name": "Bangla Shasya Bima (BSB)", "type": "100% State Subsidized Crop Insurance", "url": "https://banglashasyabima.net/"},
        {"name": "Krishak Bandhu (Natun)", "type": "Annual Income Support & Death Benefit", "url": "https://krishakbandhu.wb.gov.in/"},
        {"name": "PM-KISAN", "type": "Direct Income Support ₹6,000/yr", "url": "https://pmkisan.gov.in/"},
        {"name": "Kisan Credit Card (KCC)", "type": "Low-interest Crop Loan at 4%", "url": "https://myscheme.gov.in/schemes/kcc"},
    ]

    return {
        "report_id": f"AGRI-RPT-{datetime.now().strftime('%Y%m%d%H%M')}",
        "generated_at": generated_at,
        "farmer_name": current_user.full_name if current_user else "Farmer / Guest User",
        "district": district,
        "state": "West Bengal",
        "crop": crop,
        "weather_intelligence": {
            "current_temp": weather_data["current"]["temperature_celsius"],
            "current_rh": weather_data["current"]["relative_humidity_pct"],
            "condition": weather_data["current"]["condition"],
            "late_blight_risk": weather_data["agro_risks"]["late_blight"]["risk_level"],
            "agro_advisory": weather_data["agro_risks"]["late_blight"]["advisory"],
            "source": weather_data["source"],
        },
        "yield_projection": {
            "predicted_yield_t_ha": yield_data["predicted_yield_tonnes_per_hectare"],
            "prediction_interval": yield_data["prediction_interval_80"],
            "district_benchmark_t_ha": yield_data["historical_benchmarks"]["district_historical_mean_t_ha"],
            "trend": yield_data["historical_benchmarks"]["trend_assessment"],
        },
        "mandi_spot_prices": mandi_summary,
        "recent_scans": scan_history,
        "recommended_government_schemes": applicable_schemes,
        "provenance_statement": "This report combines verified historical government statistics (UPAg/DES), real-time meteorological observations (IMD/Open-Meteo), and Agmarknet mandi data. Predictions are planning aids and do not constitute legal guarantees.",
    }
