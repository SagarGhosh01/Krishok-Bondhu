"""
AgriShield AI - Regional Outbreak Radar Router
Provides spatial disease outbreak intelligence and nearby contagion cluster data for farmers.
"""

from fastapi import APIRouter, Query
from typing import Dict, Any, List, Optional
import math
import random

router = APIRouter(prefix="/outbreak", tags=["Outbreak Radar"])

# Seeded regional agro-climatic clusters (relative to representative agrarian coordinates)
REFERENCE_OUTBREAKS = [
    {
        "id": "OB-8421",
        "crop": "Tomato",
        "disease": "Tomato Early Blight",
        "scientific_name": "Alternaria solani",
        "severity_grade": 4,
        "reported_cases": 18,
        "bearing_deg": 45,
        "distance_factor": 0.35,  # ~8.7 km for 25km radius
        "last_reported": "2 hours ago",
        "alert": "HIGH"
    },
    {
        "id": "OB-8422",
        "crop": "Tomato",
        "disease": "Tomato Yellow Leaf Curl Virus",
        "scientific_name": "Begomovirus (Whitefly Vector)",
        "severity_grade": 3,
        "reported_cases": 9,
        "bearing_deg": 140,
        "distance_factor": 0.65,
        "last_reported": "5 hours ago",
        "alert": "MODERATE"
    },
    {
        "id": "OB-8423",
        "crop": "Potato",
        "disease": "Potato Late Blight",
        "scientific_name": "Phytophthora infestans",
        "severity_grade": 5,
        "reported_cases": 32,
        "bearing_deg": 280,
        "distance_factor": 0.45,
        "last_reported": "1 hour ago",
        "alert": "CRITICAL"
    },
    {
        "id": "OB-8424",
        "crop": "Corn",
        "disease": "Corn Common Rust",
        "scientific_name": "Puccinia sorghi",
        "severity_grade": 2,
        "reported_cases": 6,
        "bearing_deg": 210,
        "distance_factor": 0.85,
        "last_reported": "1 day ago",
        "alert": "LOW"
    },
    {
        "id": "OB-8425",
        "crop": "Potato",
        "disease": "Potato Early Blight",
        "scientific_name": "Alternaria solani",
        "severity_grade": 3,
        "reported_cases": 14,
        "bearing_deg": 330,
        "distance_factor": 0.70,
        "last_reported": "4 hours ago",
        "alert": "MODERATE"
    }
]


@router.get("/radar")
async def get_outbreak_radar(
    lat: float = Query(23.2324, description="User latitude"),
    lon: float = Query(88.3639, description="User longitude"),
    radius_km: float = Query(25.0, ge=5.0, le=100.0, description="Radar scan radius in km"),
    crop: Optional[str] = Query(None, description="Filter by crop")
) -> Dict[str, Any]:
    """
    Returns spatial disease outbreak clusters with distance, bearing, and normalized 2D radar coordinates.
    """
    clusters: List[Dict[str, Any]] = []

    for item in REFERENCE_OUTBREAKS:
        if crop and crop.lower() != "all" and crop.lower() not in item["crop"].lower():
            continue

        actual_dist = round(item["distance_factor"] * radius_km, 1)
        rad = math.radians(item["bearing_deg"])
        
        # Normalized coordinates between -1.0 and 1.0 for 2D radar display
        rel_x = round(item["distance_factor"] * math.sin(rad), 3)
        rel_y = round(-item["distance_factor"] * math.cos(rad), 3)  # Negative y is upward (North)

        clusters.append({
            **item,
            "distance_km": actual_dist,
            "relative_x": rel_x,
            "relative_y": rel_y
        })

    critical_count = sum(1 for c in clusters if c["alert"] in ["CRITICAL", "HIGH"])
    threat_level = "ELEVATED" if critical_count >= 2 else ("MODERATE" if critical_count == 1 else "NORMAL")

    return {
        "center_coordinates": {"lat": lat, "lon": lon},
        "radius_km": radius_km,
        "total_active_clusters": len(clusters),
        "threat_level": threat_level,
        "summary": f"{len(clusters)} foliar disease clusters detected within {radius_km} km radius.",
        "clusters": clusters
    }
