"""
AgriShield AI - Cross-User Data Isolation & Ownership Tests
Verifies that:
1. User B cannot view User A's farms or scans (403 Forbidden).
2. User B cannot modify or delete User A's farm records.
3. Record ownership is enforced at the database and service layer.
"""

import uuid
from starlette.testclient import TestClient
from services.api.main import app

client = TestClient(app)


def test_cross_user_isolation():
    uid_a = str(uuid.uuid4())[:8]
    uid_b = str(uuid.uuid4())[:8]

    # 1. Register User A
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"usera_{uid_a}@agrishield.ai",
        "full_name": "User Alpha",
        "password": "Password@123",
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    res_b = client.post("/api/v1/auth/register", json={
        "email": f"userb_{uid_b}@agrishield.ai",
        "full_name": "User Beta",
        "password": "Password@123",
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A creates a Farm
    farm_res = client.post("/api/v1/farms", headers=headers_a, json={
        "name": "Alpha Tomato Plot",
        "crops_grown": "Tomato",
        "area_acres": 2.5,
    })
    assert farm_res.status_code == 201
    farm_id = farm_res.json()["id"]

    # 4. User B attempts to GET User A's farm -> Expect 403 Forbidden
    res_get_b = client.get(f"/api/v1/farms/{farm_id}", headers=headers_b)
    assert res_get_b.status_code == 403, f"Expected 403 Forbidden, got {res_get_b.status_code}"

    # 5. User B attempts to UPDATE User A's farm -> Expect 403 Forbidden
    res_put_b = client.put(f"/api/v1/farms/{farm_id}", headers=headers_b, json={"name": "Hacked Plot"})
    assert res_put_b.status_code == 403

    # 6. User B attempts to DELETE User A's farm -> Expect 403 Forbidden
    res_del_b = client.delete(f"/api/v1/farms/{farm_id}", headers=headers_b)
    assert res_del_b.status_code == 403

    # 7. User A CAN access their own farm -> Expect 200 OK
    res_get_a = client.get(f"/api/v1/farms/{farm_id}", headers=headers_a)
    assert res_get_a.status_code == 200
    assert res_get_a.json()["name"] == "Alpha Tomato Plot"
