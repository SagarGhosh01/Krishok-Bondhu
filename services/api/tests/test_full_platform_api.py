"""
AgriShield AI - Comprehensive Full-Platform API Tests
Tests all Phase 4 backend endpoints: Data Sources, Yield Forecasting, Weather, Mandi, Soil, Schemes, and Reports.
"""

import pytest
from fastapi.testclient import TestClient
from services.api.main import app

client = TestClient(app)


def test_sources_endpoint():
    response = client.get("/api/v1/sources")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 6
    ids = [s["id"] for s in data["registry"]]
    assert "upag_des" in ids
    assert "agmarknet" in ids
    assert "imd_weather" in ids
    assert "soil_health_card" in ids


def test_yield_forecasting_predict():
    payload = {
        "state": "West Bengal",
        "district": "Purba Bardhaman",
        "crop": "Potato",
        "season": "Rabi",
        "area_hectares": 2.5,
        "rainfall_mm": 65.0,
        "mean_temperature_celsius": 19.5,
        "irrigation_coverage_pct": 85.0,
    }
    response = client.post("/api/v1/yield/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["crop"] == "Potato"
    assert data["predicted_yield_tonnes_per_hectare"] > 15.0
    assert data["predicted_production_tonnes"] > 30.0
    assert "prediction_interval_80" in data
    assert "historical_benchmarks" in data
    assert len(data["important_limitations"]) > 0


def test_yield_historical_and_crops():
    res_crops = client.get("/api/v1/yield/crops")
    assert res_crops.status_code == 200
    assert len(res_crops.json()["crops"]) >= 7

    res_dist = client.get("/api/v1/yield/districts")
    assert res_dist.status_code == 200
    assert "Purba Bardhaman" in res_dist.json()["districts"]

    res_hist = client.get("/api/v1/yield/historical?crop=Potato&district=Hooghly&limit=10")
    assert res_hist.status_code == 200
    data = res_hist.json()
    assert data["count"] > 0
    assert data["records"][0]["crop"] == "Potato"


def test_weather_endpoints():
    res_curr = client.get("/api/v1/weather/current?district=Purba Bardhaman")
    assert res_curr.status_code == 200
    curr = res_curr.json()
    assert "temperature_celsius" in curr["current"]
    assert "relative_humidity_pct" in curr["current"]

    res_fore = client.get("/api/v1/weather/forecast?district=Purba Bardhaman")
    assert res_fore.status_code == 200
    fore = res_fore.json()
    assert len(fore["forecast_5_days"]) >= 5
    assert "late_blight" in fore["agro_risks"]

    res_risk = client.get("/api/v1/weather/agro-risk?district=Purba Bardhaman")
    assert res_risk.status_code == 200
    risk = res_risk.json()
    assert risk["agro_risks"]["late_blight"]["risk_level"] in ["LOW", "MODERATE", "HIGH"]


def test_mandi_endpoints():
    res_prices = client.get("/api/v1/mandi/prices?commodity=Potato&limit=10")
    assert res_prices.status_code == 200
    data = res_prices.json()
    assert data["count"] > 0
    assert data["prices"][0]["commodity"] == "Potato"
    assert data["prices"][0]["modal_price"] > 500

    res_trends = client.get("/api/v1/mandi/trends?commodity=Potato&district=Purba Bardhaman")
    assert res_trends.status_code == 200
    assert len(res_trends.json()["timeline"]) > 0

    res_spread = client.get("/api/v1/mandi/spread?commodity=Potato")
    assert res_spread.status_code == 200
    assert len(res_spread.json()["markets"]) > 0

    res_comm = client.get("/api/v1/mandi/commodities")
    assert res_comm.status_code == 200
    assert "Potato" in res_comm.json()["commodities"]


def test_soil_endpoints():
    payload = {
        "ph": 6.2,
        "electrical_conductivity": 0.45,
        "organic_carbon_pct": 0.62,
        "available_nitrogen": 320.0,
        "available_phosphorus": 18.5,
        "available_potassium": 195.0,
    }
    response = client.post("/api/v1/soil/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["fertility_index_score"] > 50
    assert "ph" in data["parameters"]
    assert "guidance" in data["parameters"]["ph"]
    assert len(data["crop_suitability"]) >= 5

    res_bench = client.get("/api/v1/soil/benchmarks")
    assert res_bench.status_code == 200
    assert len(res_bench.json()["parameters"]) == 6


def test_schemes_endpoints():
    # English
    res_en = client.get("/api/v1/schemes?language=en")
    assert res_en.status_code == 200
    data_en = res_en.json()
    assert data_en["count"] >= 8
    titles = [s["title"] for s in data_en["schemes"]]
    assert any("Bangla Shasya Bima" in t for t in titles)

    # Bengali
    res_bn = client.get("/api/v1/schemes?language=bn")
    assert res_bn.status_code == 200
    data_bn = res_bn.json()
    titles_bn = [s["title"] for s in data_bn["schemes"]]
    assert any("বাংলা শস্য বীমা" in t for t in titles_bn)

    # Specific scheme detail
    res_detail = client.get("/api/v1/schemes/BSB_WB")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["code"] == "BSB-WB"
    assert "banglashasyabima.net" in detail["official_url"]
    assert len(detail["eligibility_criteria"]) > 0
    assert len(detail["documents_required"]) > 0


def test_farmer_summary_report():
    response = client.get("/api/v1/reports/farmer-summary?district=Purba Bardhaman&crop=Potato")
    assert response.status_code == 200
    report = response.json()
    assert "report_id" in report
    assert report["district"] == "Purba Bardhaman"
    assert "weather_intelligence" in report
    assert "yield_projection" in report
    assert "mandi_spot_prices" in report
    assert "recommended_government_schemes" in report
