"""
AgriShield AI - Government Scheme Discovery Router
Provides searchable directory of verified Central and State (West Bengal) agricultural welfare schemes.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import json

from services.api.database.connection import get_db
from services.api.database.models import GovernmentScheme

router = APIRouter(prefix="/schemes", tags=["Government Scheme Discovery"])


@router.get("")
def list_government_schemes(
    category: Optional[str] = Query(None, description="Filter by category (e.g. Income Support, Insurance, Credit)"),
    search: Optional[str] = Query(None, description="Search keyword in scheme name or agency"),
    language: str = Query("en", pattern="^(en|bn|hi)$", description="Display language"),
    db: Session = Depends(get_db),
):
    """
    Returns verified government schemes with official portal links and eligibility requirements.
    """
    query = db.query(GovernmentScheme)
    if category and category != "All":
        query = query.filter(GovernmentScheme.category.ilike(f"%{category}%"))
    if search:
        query = query.filter(
            (GovernmentScheme.title_en.ilike(f"%{search}%")) |
            (GovernmentScheme.title_hi.ilike(f"%{search}%")) |
            (GovernmentScheme.title_bn.ilike(f"%{search}%")) |
            (GovernmentScheme.sponsoring_agency.ilike(f"%{search}%"))
        )

    schemes = query.all()

    results = []
    for s in schemes:
        title = s.title_bn if language == "bn" else s.title_hi if language == "hi" else s.title_en
        results.append({
            "id": s.id,
            "code": s.code,
            "title": title,
            "title_en": s.title_en,
            "category": s.category,
            "sponsoring_agency": s.sponsoring_agency,
            "official_url": s.official_url,
            "eligibility_criteria": json.loads(s.eligibility_criteria_json) if s.eligibility_criteria_json else [],
            "documents_required": json.loads(s.documents_required_json) if s.documents_required_json else [],
            "benefits_summary": json.loads(s.benefits_summary_json) if s.benefits_summary_json else {},
            "last_verified_date": s.last_verified_date,
        })

    return {
        "count": len(results),
        "language": language,
        "schemes": results,
        "disclaimer": "AgriShield AI provides verified public information from official government portals. AgriShield AI never charges application fees and never collects Aadhaar numbers or banking passwords."
    }


@router.get("/categories")
def get_scheme_categories(db: Session = Depends(get_db)):
    """Returns unique scheme categories."""
    categories = db.query(GovernmentScheme.category).distinct().all()
    return {"categories": ["All"] + sorted([c[0] for c in categories if c[0]])}


@router.get("/{scheme_id}")
def get_scheme_detail(
    scheme_id: str,
    language: str = Query("en", pattern="^(en|bn|hi)$"),
    db: Session = Depends(get_db),
):
    """Returns complete verified dossier for a specific government scheme."""
    s = db.query(GovernmentScheme).filter(GovernmentScheme.id == scheme_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Scheme '{scheme_id}' not found.")

    title = s.title_bn if language == "bn" else s.title_hi if language == "hi" else s.title_en

    return {
        "id": s.id,
        "code": s.code,
        "title": title,
        "title_en": s.title_en,
        "title_hi": s.title_hi,
        "title_bn": s.title_bn,
        "category": s.category,
        "sponsoring_agency": s.sponsoring_agency,
        "official_url": s.official_url,
        "eligibility_criteria": json.loads(s.eligibility_criteria_json) if s.eligibility_criteria_json else [],
        "documents_required": json.loads(s.documents_required_json) if s.documents_required_json else [],
        "benefits_summary": json.loads(s.benefits_summary_json) if s.benefits_summary_json else {},
        "last_verified_date": s.last_verified_date,
        "security_warning": "Always apply directly on the official government website ending with .gov.in or .nic.in. Beware of unverified intermediaries or phishing links."
    }
