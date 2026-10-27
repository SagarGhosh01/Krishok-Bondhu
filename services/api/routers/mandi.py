"""
AgriShield AI - Mandi Price Intelligence Router
Provides verified wholesale market prices, arrival volumes, multi-mandi spread comparisons,
and historical trend analytics based on Agmarknet data.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from services.api.database.connection import get_db
from services.api.database.models import MandiPrice

router = APIRouter(prefix="/mandi", tags=["Mandi Price Intelligence"])


@router.get("/prices")
def get_mandi_prices(
    state: Optional[str] = Query("West Bengal", description="State name"),
    district: Optional[str] = Query(None, description="Filter by district"),
    commodity: Optional[str] = Query(None, description="Filter by commodity (e.g., Potato, Tomato)"),
    market: Optional[str] = Query(None, description="Filter by market/mandi name"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Returns latest reported mandi spot transactions and arrival volumes.
    """
    query = db.query(MandiPrice)
    if state:
        query = query.filter(MandiPrice.state.ilike(f"%{state}%"))
    if district:
        query = query.filter(MandiPrice.district.ilike(f"%{district}%"))
    if commodity:
        query = query.filter(MandiPrice.commodity.ilike(f"%{commodity}%"))
    if market:
        query = query.filter(MandiPrice.market_name.ilike(f"%{market}%"))

    # Return latest records by arrival_date desc
    records = query.order_by(MandiPrice.arrival_date.desc(), MandiPrice.commodity).limit(limit).all()

    return {
        "count": len(records),
        "source": "Agmarknet (Directorate of Marketing & Inspection, MoA&FW, GoI)",
        "unit": "₹ per Quintal (100 kg)",
        "prices": [
            {
                "id": r.id,
                "state": r.state,
                "district": r.district,
                "market": r.market_name,
                "commodity": r.commodity,
                "variety": r.variety,
                "arrival_date": r.arrival_date,
                "min_price": r.min_price,
                "max_price": r.max_price,
                "modal_price": r.modal_price,
                "arrivals_volume_quintals": r.arrivals_volume,
                "reported_at": r.source_timestamp.isoformat() if r.source_timestamp else None,
            }
            for r in records
        ],
        "disclaimer": "Wholesale prices reflect past and physical spot transactions at registered APMC mandis. They do not constitute guaranteed future prices or retail farmgate contracts."
    }


@router.get("/trends")
def get_mandi_trends(
    commodity: str = Query("Potato", description="Commodity name"),
    district: Optional[str] = Query("Purba Bardhaman", description="District name"),
    db: Session = Depends(get_db),
):
    """
    Returns 7-day price timeline for a specific commodity to visualize price trajectories.
    """
    query = db.query(MandiPrice).filter(MandiPrice.commodity.ilike(f"%{commodity}%"))
    if district:
        query = query.filter(MandiPrice.district.ilike(f"%{district}%"))

    records = query.order_by(MandiPrice.arrival_date.asc()).all()

    # Aggregate by arrival_date
    trend_map = {}
    for r in records:
        d = r.arrival_date
        if d not in trend_map:
            trend_map[d] = {"min_prices": [], "max_prices": [], "modal_prices": [], "arrivals": []}
        trend_map[d]["min_prices"].append(r.min_price)
        trend_map[d]["max_prices"].append(r.max_price)
        trend_map[d]["modal_prices"].append(r.modal_price)
        trend_map[d]["arrivals"].append(r.arrivals_volume)

    trend_series = []
    for d in sorted(trend_map.keys()):
        trend_series.append({
            "date": d,
            "avg_modal_price": round(float(sum(trend_map[d]["modal_prices"]) / len(trend_map[d]["modal_prices"])), 1),
            "min_modal_price": min(trend_map[d]["modal_prices"]),
            "max_modal_price": max(trend_map[d]["modal_prices"]),
            "total_arrivals_quintals": round(float(sum(trend_map[d]["arrivals"])), 1),
        })

    return {
        "commodity": commodity,
        "district": district or "All Districts",
        "trend_days": len(trend_series),
        "timeline": trend_series,
    }


@router.get("/spread")
def get_mandi_spread(
    commodity: str = Query("Potato", description="Commodity name"),
    db: Session = Depends(get_db),
):
    """
    Compares prices across multiple mandis for a commodity to help farmers identify optimal markets.
    """
    # Subquery latest arrival date per market
    latest_records = (
        db.query(MandiPrice)
        .filter(MandiPrice.commodity.ilike(f"%{commodity}%"))
        .order_by(MandiPrice.arrival_date.desc())
        .limit(30)
        .all()
    )

    # Unique per market
    markets_seen = set()
    comparison = []
    for r in latest_records:
        if r.market_name not in markets_seen:
            markets_seen.add(r.market_name)
            comparison.append({
                "market": r.market_name,
                "district": r.district,
                "modal_price": r.modal_price,
                "min_price": r.min_price,
                "max_price": r.max_price,
                "arrivals_volume": r.arrivals_volume,
                "date": r.arrival_date,
            })

    # Sort descending by modal price
    comparison.sort(key=lambda x: x["modal_price"], reverse=True)

    return {
        "commodity": commodity,
        "comparison_count": len(comparison),
        "markets": comparison,
    }


@router.get("/commodities")
def get_available_commodities(db: Session = Depends(get_db)):
    """Returns list of all available commodities in the mandi database."""
    commodities = db.query(MandiPrice.commodity).distinct().all()
    return {"commodities": sorted([c[0] for c in commodities if c[0]])}


@router.get("/markets")
def get_available_markets(db: Session = Depends(get_db)):
    """Returns list of markets and their districts."""
    results = db.query(MandiPrice.market_name, MandiPrice.district).distinct().all()
    return {"markets": [{"market": r[0], "district": r[1]} for r in results]}
