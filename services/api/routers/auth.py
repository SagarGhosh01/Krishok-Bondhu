"""
AgriShield AI - Authentication Router & RBAC Dependencies
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from services.api.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    security_bearer,
)
from services.api.database.connection import get_db
from services.api.database.models import User
from services.api.schemas.auth import UserRegister, UserLogin, UserOut, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_current_user(
    credentials: Optional[any] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Dependency for extracting and validating authenticated user."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    return user


def get_current_user_optional(
    credentials: Optional[any] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optional authentication dependency for public/guest screening flows."""
    if not credentials or not credentials.credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user account."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=user_in.role or "farmer",
        preferred_language=user_in.preferred_language or "en",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    """Authenticates credentials and returns JWT bearer tokens."""
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user.id, role=user.role)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    """Returns profile for currently authenticated user."""
    return UserOut.model_validate(current_user)
