"""
AgriShield AI - Security, Cryptography & JWT Token Management
Implements salted password hashing and stateless JWT bearer authentication.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from services.api.core.config import settings

# CryptContext supporting bcrypt with PBKDF2 fallback
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hashes a plaintext password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: Union[str, Any], role: str = "farmer", expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed HMAC-SHA256 JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed JWT refresh token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": str(subject),
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
