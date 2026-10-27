"""
AgriShield AI - Data Source Registry & Freshness API Router
Exposes official data source provenance, license details, and synchronization status.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import DataSource

router = APIRouter(prefix="/sources", tags=["Data Sources & Freshness"])


@router.get("")
def list_data_sources(db: Session = Depends(get_db)):
    """
    Returns registered official Indian government and research data sources
    with their provenance, licenses, and last synchronization timestamps.
    """
    sources = db.query(DataSource).all()
    return {
        "count": len(sources),
        "registry": [
            {
                "id": s.id,
                "name": s.name,
                "publisher": s.publisher,
                "resource_url": s.resource_url,
                "license": s.license,
                "category": s.category,
                "sync_status": s.sync_status,
                "record_count": s.record_count,
                "last_successful_sync": s.last_successful_sync.isoformat() if s.last_successful_sync else None,
            }
            for s in sources
        ],
        "governance_policy": "Strict adherence to official government open data policies (NDSAP / GODL). Zero synthetic or fabricated records in production datasets."
    }


@router.get("/{source_id}")
def get_source_detail(source_id: str, db: Session = Depends(get_db)):
    """Returns provenance and status for a specific data source."""
    s = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Data source '{source_id}' not found in registry.")

    return {
        "id": s.id,
        "name": s.name,
        "publisher": s.publisher,
        "resource_url": s.resource_url,
        "license": s.license,
        "category": s.category,
        "sync_status": s.sync_status,
        "record_count": s.record_count,
        "last_successful_sync": s.last_successful_sync.isoformat() if s.last_successful_sync else None,
        "error_log": s.error_log,
    }
