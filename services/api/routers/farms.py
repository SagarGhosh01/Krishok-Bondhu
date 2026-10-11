"""
AgriShield AI - Farm Management Router
Provides full CRUD for farmer plots with backend-enforced record ownership.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.api.database.connection import get_db
from services.api.database.models import User, Farm
from services.api.routers.auth import get_current_user
from services.api.schemas.farm import FarmCreate, FarmUpdate, FarmOut

router = APIRouter(prefix="/farms", tags=["Farm Management"])


@router.post("", response_model=FarmOut, status_code=status.HTTP_201_CREATED)
def create_farm(
    farm_in: FarmCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new farm plot associated with the authenticated farmer."""
    farm = Farm(
        user_id=current_user.id,
        name=farm_in.name,
        location_lat=farm_in.location_lat,
        location_lng=farm_in.location_lng,
        soil_type=farm_in.soil_type,
        area_acres=farm_in.area_acres,
        crops_grown=farm_in.crops_grown,
    )
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return FarmOut.model_validate(farm)


@router.get("", response_model=List[FarmOut])
def list_user_farms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all farms belonging to current user."""
    farms = db.query(Farm).filter(Farm.user_id == current_user.id).order_by(Farm.created_at.desc()).all()
    return [FarmOut.model_validate(f) for f in farms]


@router.get("/{farm_id}", response_model=FarmOut)
def get_farm(
    farm_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves a single farm plot with strict ownership verification."""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm record not found.")

    if farm.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to access this farm.",
        )

    return FarmOut.model_validate(farm)


@router.put("/{farm_id}", response_model=FarmOut)
def update_farm(
    farm_id: str,
    farm_in: FarmUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates farm details with strict ownership verification."""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm record not found.")

    if farm.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify other users' farms.",
        )

    for field, val in farm_in.model_dump(exclude_unset=True).items():
        setattr(farm, field, val)

    db.commit()
    db.refresh(farm)
    return FarmOut.model_validate(farm)


@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(
    farm_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a farm plot with strict ownership verification."""
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm record not found.")

    if farm.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot delete other users' farms.",
        )

    db.delete(farm)
    db.commit()
    return None
