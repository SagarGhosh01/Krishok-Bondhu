"""
AgriShield AI - Disease Knowledge Base & Library Router
Provides search, filtering, and verified agronomy guidance across Tomato, Potato, and Corn.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import Disease, DiseaseTranslation, Advisory
from services.api.schemas.advisory import DiseaseDetailOut, DiseaseTranslationOut, AdvisoryOut

router = APIRouter(prefix="/diseases", tags=["Disease Knowledge Base"])


@router.get("", response_model=List[DiseaseDetailOut])
def list_diseases(
    crop: Optional[str] = None,
    q: Optional[str] = None,
    language: str = Query("en", regex="^(en|bn|hi)$"),
    db: Session = Depends(get_db),
):
    """Searches disease library with filters by crop, query string, and language."""
    query = db.query(Disease)

    if crop:
        query = query.filter(Disease.crop.ilike(f"%{crop}%"))

    diseases = query.all()
    results = []

    for d in diseases:
        # Check text search filter
        if q:
            q_lower = q.lower()
            match = (
                q_lower in d.class_key.lower()
                or q_lower in d.scientific_name.lower()
                or any(q_lower in t.display_name.lower() or q_lower in t.description.lower() for t in d.translations)
            )
            if not match:
                continue

        results.append(
            DiseaseDetailOut(
                id=d.id,
                class_key=d.class_key,
                crop=d.crop,
                scientific_name=d.scientific_name,
                pathogen_type=d.pathogen_type,
                is_healthy=d.is_healthy,
                translations=[DiseaseTranslationOut.model_validate(t) for t in d.translations],
                advisories=[AdvisoryOut.model_validate(a) for a in d.advisories],
            )
        )

    return results


@router.get("/{class_key}", response_model=DiseaseDetailOut)
def get_disease_detail(
    class_key: str,
    db: Session = Depends(get_db),
):
    """Retrieves full details and multilanguage advisories for a specific disease class."""
    disease = db.query(Disease).filter(Disease.class_key == class_key).first()
    if not disease:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disease class not found.")

    return DiseaseDetailOut(
        id=disease.id,
        class_key=disease.class_key,
        crop=disease.crop,
        scientific_name=disease.scientific_name,
        pathogen_type=disease.pathogen_type,
        is_healthy=disease.is_healthy,
        translations=[DiseaseTranslationOut.model_validate(t) for t in disease.translations],
        advisories=[AdvisoryOut.model_validate(a) for a in disease.advisories],
    )
