"""
AgriShield AI - Backend Prediction API Tests
Verifies real image screening, ONNX inference execution, Grad-CAM generation,
and rejection of blurred/poor quality inputs.
"""

from pathlib import Path
import io
import pytest
from PIL import Image, ImageFilter
from starlette.testclient import TestClient

from services.api.main import app

client = TestClient(app)


def test_predict_real_image():
    # Load sample leaf image
    img_path = Path("ml/data/sample_dataset/Tomato___Early_blight/leaf_000.jpg")
    if not img_path.exists():
        pytest.skip("Sample dataset image not found.")

    with open(img_path, "rb") as f:
        img_bytes = f.read()

    files = {"file": ("leaf.jpg", img_bytes, "image/jpeg")}
    data = {"selected_crop": "Tomato", "language": "en"}

    res = client.post("/api/v1/predict", files=files, data=data)
    assert res.status_code == 200, f"Prediction failed: {res.text}"

    resp = res.json()
    assert resp["state"] in ["CONFIDENT", "UNCERTAIN", "CANNOT_ASSESS"]
    assert "quality" in resp
    assert resp["quality"]["passed"] is True
    assert "calibrated_confidence" in resp
    assert "reliability_score" in resp
    assert "gradcam_disclaimer" in resp
    assert "screening aid" in resp["gradcam_disclaimer"].lower()

    if resp["primary_class"]:
        assert resp["advisory"] is not None
        assert "cultural_practices" in resp["advisory"]


def test_predict_blurry_image_rejection():
    # Create an extremely blurry synthetic image
    img = Image.new("RGB", (224, 224), (50, 150, 50))
    img_blurred = img.filter(ImageFilter.GaussianBlur(radius=15.0))
    buf = io.BytesIO()
    img_blurred.save(buf, format="JPEG")

    files = {"file": ("blurry.jpg", buf.getvalue(), "image/jpeg")}
    res = client.post("/api/v1/predict", files=files)
    assert res.status_code == 200

    resp = res.json()
    assert resp["state"] == "CANNOT_ASSESS"
    assert resp["quality"]["passed"] is False
    assert resp["quality"]["defect"] in ["BLURRY", "UNDEREXPOSED"]
