"""
AgriShield AI - Tests for Advanced Analytics (Severity Estimator & Epidemiology)
"""

import numpy as np
import pytest
from ml.src.reliability.severity_estimator import estimate_foliar_severity
from services.api.services.epidemiology import calculate_wallin_bsv, generate_epidemiological_forecast


def test_severity_estimator_synthetic_leaf():
    # Create synthetic leaf: green image with a brown lesion square
    h, w = 224, 224
    img = np.zeros((h, w, 3), dtype=np.uint8)
    # Fill green background
    img[:, :] = [34, 139, 34]
    # Add brown necrotic lesion patch (50x50 pixels)
    img[80:130, 80:130] = [139, 69, 19]

    # Create dummy saliency map
    saliency = np.zeros((h, w), dtype=np.float32)
    saliency[70:140, 70:140] = 0.8

    result = estimate_foliar_severity(img, gradcam_mask=saliency, generate_overlay=True)

    assert 0.0 <= result.severity_percentage <= 100.0
    assert 1 <= result.severity_grade <= 5
    assert result.lesion_spot_count >= 1
    assert result.contour_image_base64 is not None
    assert result.contour_image_base64.startswith("data:image/jpeg;base64,")


def test_wallin_bsv_matrix():
    # Dry or cold conditions -> BSV 0
    assert calculate_wallin_bsv(temp_c=5.0, rh_pct=95.0, leaf_wetness_hours=20.0) == 0
    assert calculate_wallin_bsv(temp_c=20.0, rh_pct=60.0, leaf_wetness_hours=20.0) == 0

    # Favorable temp (20 C) with high leaf wetness
    assert calculate_wallin_bsv(temp_c=20.0, rh_pct=92.0, leaf_wetness_hours=11.0) == 1
    assert calculate_wallin_bsv(temp_c=20.0, rh_pct=92.0, leaf_wetness_hours=14.0) == 2
    assert calculate_wallin_bsv(temp_c=20.0, rh_pct=92.0, leaf_wetness_hours=17.0) == 3
    assert calculate_wallin_bsv(temp_c=20.0, rh_pct=92.0, leaf_wetness_hours=20.0) == 4


def test_epidemiological_forecast_structure():
    forecast = generate_epidemiological_forecast(
        crop="Tomato",
        disease="Early Blight",
        current_temp=22.0,
        current_rh=90.0,
        rainfall_mm=5.0
    )

    assert "accumulated_7day_bsv" in forecast
    assert "overall_risk_category" in forecast
    assert "daily_timeline" in forecast
    assert len(forecast["daily_timeline"]) == 7
    assert forecast["spore_germination_latency_hours"] > 0
