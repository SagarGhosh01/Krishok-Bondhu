"""
AgriShield AI - API Tests for Krishi Mitra Assistant, Forecast, and Outbreak Radar
"""

import pytest
from fastapi.testclient import TestClient
from services.api.main import app

client = TestClient(app)


def test_assistant_chat_english():
    response = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "How do I use organic neem spray for leaf spots?",
            "language": "en",
            "disease_context": "Tomato Early Blight"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "audio_text" in data
    assert len(data["key_takeaways"]) >= 1
    assert "Neem" in data["reply"] or "Trichoderma" in data["reply"]


def test_assistant_chat_multilingual():
    # Bengali test
    bn_res = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "কীটনাশক স্প্রে করার সঠিক পদ্ধতি কী?",
            "language": "bn"
        }
    )
    assert bn_res.status_code == 200
    assert "কৃষি বিজ্ঞান কেন্দ্র" in bn_res.json()["reply"]

    # Hindi test
    hi_res = client.post(
        "/api/v1/assistant/chat",
        json={
            "message": "जैविक उपचार क्या है?",
            "language": "hi"
        }
    )
    assert hi_res.status_code == 200
    assert "नीम" in hi_res.json()["reply"] or "ट्राइकोडर्मा" in hi_res.json()["reply"]


def test_epidemiological_forecast_endpoint():
    res = client.get(
        "/api/v1/forecast/risk",
        params={
            "crop": "Tomato",
            "disease": "Tomato Early Blight",
            "temp_c": 23.5,
            "rh_pct": 88.0,
            "rainfall_mm": 5.0
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "accumulated_7day_bsv" in data
    assert len(data["daily_timeline"]) == 7


def test_outbreak_radar_endpoint():
    res = client.get(
        "/api/v1/outbreak/radar",
        params={
            "lat": 23.23,
            "lon": 88.36,
            "radius_km": 25.0
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_active_clusters"] >= 1
    assert "clusters" in data
    assert "threat_level" in data
    # Verify coordinate projection
    cluster = data["clusters"][0]
    assert -1.0 <= cluster["relative_x"] <= 1.0
    assert -1.0 <= cluster["relative_y"] <= 1.0
