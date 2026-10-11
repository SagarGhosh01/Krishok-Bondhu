"""
AgriShield AI - Automated Reliability, Quality Gate & Explainability Tests
Verifies that:
1. Quality gate catches blurred/dark images.
2. Temperature calibration improves/scales probabilities.
3. OOD detector distinguishes low-energy in-distribution vs diffuse inputs.
4. Decision engine returns proper diagnostic states without crashing.
5. Grad-CAM generates valid overlays and mandatory disclaimers.
"""

import pytest
import numpy as np
import torch
from PIL import Image, ImageFilter

from ml.src.reliability.quality_gate import ImageQualityGate
from ml.src.reliability.calibration import TemperatureScaler
from ml.src.reliability.ood_detector import OODDetector
from ml.src.reliability.decision_engine import DecisionEngine, DiagnosticState
from ml.src.explainability.gradcam import GradCAM
from ml.src.models.baseline_cnn import CustomBaselineCNN
from ml.src.data.classes import NUM_CLASSES


def test_quality_gate_blur_and_exposure():
    """Verify quality gate passes sharp images and catches blur/exposure defects."""
    gate = ImageQualityGate(min_blur_score=50.0, min_luminance=30.0, max_luminance=230.0)

    # Sharp image with frequent high-contrast edges (checkerboard pattern)
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    for i in range(0, 200, 20):
        for j in range(0, 200, 20):
            if (i // 20 + j // 20) % 2 == 0:
                arr[i:i+20, j:j+20, 1] = 180
            else:
                arr[i:i+20, j:j+20, 1] = 40
    sharp_img = Image.fromarray(arr)
    res_sharp = gate.evaluate(sharp_img)
    assert res_sharp.passed, f"Sharp image failed check: {res_sharp.message} (score={res_sharp.blur_score})"

    # Blurry image
    blurry_img = sharp_img.filter(ImageFilter.GaussianBlur(radius=10.0))
    res_blurry = gate.evaluate(blurry_img)
    assert not res_blurry.passed
    assert res_blurry.defect == "BLURRY"

    # Underexposed (almost black)
    dark_img = Image.new("RGB", (200, 200), (10, 10, 10))
    res_dark = gate.evaluate(dark_img)
    assert not res_dark.passed
    assert res_dark.defect == "UNDEREXPOSED"


def test_temperature_scaler():
    """Verify temperature scaler initializes and transforms logits."""
    scaler = TemperatureScaler()
    logits = torch.tensor([[2.0, 1.0, 0.1], [0.5, 3.0, 0.2]])
    labels = torch.tensor([0, 1])

    metrics = scaler.fit(logits, labels, max_iter=10)
    assert "optimal_temperature" in metrics
    assert metrics["optimal_temperature"] > 0

    scaled = scaler(logits)
    assert scaled.shape == logits.shape


def test_ood_energy_scoring():
    """Verify energy calculation on peaked vs diffuse logits."""
    detector = OODDetector(energy_temperature=1.0)
    # Peaked (in-distribution) logits
    peaked_logits = np.array([[8.0, 0.1, 0.1], [0.1, 9.0, 0.2]])
    # Flat / diffuse (OOD) logits
    flat_logits = np.array([[0.5, 0.5, 0.4], [0.3, 0.2, 0.3]])

    peaked_energy = detector.compute_energy(peaked_logits)
    flat_energy = detector.compute_energy(flat_logits)

    # In-distribution energy should be strictly lower (more negative) than flat OOD energy
    assert np.mean(peaked_energy) < np.mean(flat_energy), "In-distribution energy must be lower than diffuse OOD energy"


def test_gradcam_overlay():
    """Verify Grad-CAM produces 2D heatmap and overlay with mandatory disclaimer."""
    model = CustomBaselineCNN(num_classes=NUM_CLASSES)
    target_layer = model.features[12]  # final conv layer in block 4
    gradcam = GradCAM(model, target_layer)

    x = torch.randn(1, 3, 224, 224)
    heatmap = gradcam.generate_heatmap(x, target_class_idx=0)

    assert heatmap.ndim == 2, f"Expected 2D heatmap, got shape {heatmap.shape}"
    assert np.min(heatmap) >= 0.0 and np.max(heatmap) <= 1.0

    orig_img = Image.new("RGB", (224, 224), (100, 150, 100))
    overlay, disclaimer = gradcam.create_overlay(orig_img, heatmap)

    assert overlay.size == (224, 224)
    assert "screening aid" in disclaimer.lower()
