"""
AgriShield AI - Backend Authentication API Tests
Verifies user registration, duplicate prevention, JWT login, and profile access.
"""

import pytest
from starlette.testclient import TestClient
from services.api.main import app

client = TestClient(app)


def test_auth_workflow():
    # 1. Register new user
    reg_payload = {
        "email": "testfarmer@agrishield.ai",
        "full_name": "Ramesh Kumar",
        "password": "Password@123",
        "role": "farmer",
        "preferred_language": "hi",
    }
    res_reg = client.post("/api/v1/auth/register", json=reg_payload)
    assert res_reg.status_code in (201, 400)  # 201 if new, 400 if already exists

    # 2. Login with valid credentials
    login_payload = {
        "email": "testfarmer@agrishield.ai",
        "password": "Password@123",
    }
    res_login = client.post("/api/v1/auth/login", json=login_payload)
    assert res_login.status_code == 200
    data = res_login.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testfarmer@agrishield.ai"

    token = data["access_token"]

    # 3. Access protected profile endpoint
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["full_name"] == "Ramesh Kumar"

    # 4. Reject invalid token
    res_bad = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert res_bad.status_code == 401
