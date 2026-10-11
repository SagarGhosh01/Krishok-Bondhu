"""
AgriShield AI - Offline Batch Synchronization & Idempotency Tests
Verifies that:
1. Batches of offline scans sync successfully.
2. Re-transmitting previously synced client UUIDs results in duplicate_skipped (idempotent).
"""

import base64
import uuid
from pathlib import Path
from starlette.testclient import TestClient
from services.api.main import app

client = TestClient(app)


def test_offline_sync_idempotency():
    img_path = Path("ml/data/sample_dataset/Tomato___Early_blight/leaf_000.jpg")
    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    client_uuid = str(uuid.uuid4())

    batch_payload = {
        "items": [
            {
                "client_uuid": client_uuid,
                "created_at": "2026-10-11T09:00:00Z",
                "image_base64": img_b64,
                "filename": "offline_tomato.jpg",
                "selected_crop": "Tomato",
            }
        ]
    }

    # 1. First sync -> Expect synchronized
    res1 = client.post("/api/v1/sync", json=batch_payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["synchronized_count"] == 1
    assert data1["duplicate_count"] == 0
    assert data1["results"][0]["status"] == "synchronized"

    # 2. Retry identical sync -> Expect duplicate_skipped (idempotent safe)
    res2 = client.post("/api/v1/sync", json=batch_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["synchronized_count"] == 0
    assert data2["duplicate_count"] == 1
    assert data2["results"][0]["status"] == "duplicate_skipped"
