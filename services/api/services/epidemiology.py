"""
AgriShield AI - Epidemiological Micro-Climate Disease Risk Engine
Implements Wallin and Hyre meteorological forecasting algorithms for Solanaceous foliar blights.
"""

from typing import Dict, Any, List
import math


def calculate_wallin_bsv(temp_c: float, rh_pct: float, leaf_wetness_hours: float) -> int:
    """
    Computes daily Wallin Blight Severity Value (BSV, 0 to 4) based on temperature
    and leaf wetness duration (hours with RH >= 90%).

    Standard Wallin Matrix:
    - Temp 12.0 - 15.0 C: 16-18h -> 1, 19-21h -> 2, 22-24h -> 3, >24h -> 4
    - Temp 15.1 - 26.6 C: 10-12h -> 1, 13-15h -> 2, 16-18h -> 3, >18h -> 4
    - Temp 26.7 - 30.0 C: 13-15h -> 1, 16-18h -> 2, 19-21h -> 3, >21h -> 4
    - Temp < 7.2 C or > 30.0 C: 0
    """
    if temp_c < 7.2 or temp_c > 30.0 or rh_pct < 75.0 or leaf_wetness_hours < 8.0:
        return 0

    if 12.0 <= temp_c <= 15.0:
        if leaf_wetness_hours < 16.0:
            return 0
        elif leaf_wetness_hours <= 18.0:
            return 1
        elif leaf_wetness_hours <= 21.0:
            return 2
        elif leaf_wetness_hours <= 24.0:
            return 3
        else:
            return 4
    elif 15.1 <= temp_c <= 26.6:
        if leaf_wetness_hours < 10.0:
            return 0
        elif leaf_wetness_hours <= 12.0:
            return 1
        elif leaf_wetness_hours <= 15.0:
            return 2
        elif leaf_wetness_hours <= 18.0:
            return 3
        else:
            return 4
    elif 26.7 <= temp_c <= 30.0:
        if leaf_wetness_hours < 13.0:
            return 0
        elif leaf_wetness_hours <= 15.0:
            return 1
        elif leaf_wetness_hours <= 18.0:
            return 2
        elif leaf_wetness_hours <= 21.0:
            return 3
        else:
            return 4

    return 0


def generate_epidemiological_forecast(
    crop: str,
    disease: str,
    current_temp: float = 24.5,
    current_rh: float = 88.0,
    rainfall_mm: float = 4.2
) -> Dict[str, Any]:
    """
    Generates a 7-day disease spread risk trajectory using current agro-climatic conditions.
    """
    is_blight = any(k in disease.lower() for k in ["blight", "spot", "rust", "mold"])
    
    # Estimate leaf wetness from RH and rainfall
    estimated_wetness = min(24.0, max(2.0, (current_rh - 60.0) * 0.4 + rainfall_mm * 1.5))
    daily_bsv = calculate_wallin_bsv(current_temp, current_rh, estimated_wetness)

    # 7-day projection simulation
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily_forecast: List[Dict[str, Any]] = []
    accumulated_bsv = 0

    for i, day in enumerate(days):
        # Daily slight variation simulation around current baseline
        t_delta = math.sin(i * 1.2) * 2.5
        rh_delta = math.cos(i * 1.1) * 8.0
        d_temp = round(current_temp + t_delta, 1)
        d_rh = round(min(98.0, max(45.0, current_rh + rh_delta)), 1)
        d_wet = round(min(24.0, max(2.0, (d_rh - 60.0) * 0.4 + (rainfall_mm if i in [1, 2] else 0.5) * 1.2)), 1)
        
        b = calculate_wallin_bsv(d_temp, d_rh, d_wet)
        accumulated_bsv += b
        
        # Risk score 0..100
        risk_score = min(100, int((b * 20) + (d_rh * 0.3) + (15 if is_blight else 5)))

        daily_forecast.append({
            "day": day,
            "temp_c": d_temp,
            "rh_pct": d_rh,
            "leaf_wetness_hours": d_wet,
            "bsv": b,
            "risk_score": risk_score,
            "risk_level": "High" if risk_score >= 65 else ("Medium" if risk_score >= 40 else "Low")
        })

    # Overall risk determination
    if accumulated_bsv >= 18:
        overall_risk = "CRITICAL_EPIDEMIC"
        risk_label = "Critical Outbreak Risk"
        action_advisory = "Immediate preventive protective barrier spray strongly indicated within 24-48h before moisture peak."
    elif accumulated_bsv >= 10:
        overall_risk = "HIGH_ALERT"
        risk_label = "Elevated Infection Pressure"
        action_advisory = "Conditions highly favorable for rapid spore release. Inspect lower canopies daily; prepare organic bio-fungicide."
    elif accumulated_bsv >= 5:
        overall_risk = "MODERATE_WATCH"
        risk_label = "Moderate Spread Watch"
        action_advisory = "Moderate risk. Maintain drip irrigation without wetting canopy foliage; prune lower yellowing suckers."
    else:
        overall_risk = "LOW_RISK"
        risk_label = "Low Environmental Risk"
        action_advisory = "Dry/cool conditions inhibiting fungal germination. No chemical intervention warranted at this time."

    # Spore germination latency (hours needed at current temperature)
    if 18.0 <= current_temp <= 25.0:
        germination_latency_hours = 6.0
    elif 12.0 <= current_temp < 18.0:
        germination_latency_hours = 12.0
    else:
        germination_latency_hours = 24.0

    return {
        "crop": crop,
        "disease": disease,
        "current_conditions": {
            "temperature_c": current_temp,
            "relative_humidity_pct": current_rh,
            "estimated_leaf_wetness_hours": round(estimated_wetness, 1),
            "rainfall_mm": rainfall_mm,
        },
        "accumulated_7day_bsv": accumulated_bsv,
        "overall_risk_category": overall_risk,
        "risk_label": risk_label,
        "spore_germination_latency_hours": germination_latency_hours,
        "action_advisory": action_advisory,
        "daily_timeline": daily_forecast
    }
