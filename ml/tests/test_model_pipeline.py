"""
AgriShield AI - Model Architecture and Forward/Backward Pipeline Tests
Verifies that all architectures output valid 17-class logits, backpropagate gradients,
and calculate evaluation metrics accurately.
"""

import pytest
import torch
import numpy as np

from ml.src.data.classes import NUM_CLASSES, CLASS_NAMES
from ml.src.models.baseline_cnn import CustomBaselineCNN
from ml.src.models.classifier import build_model
from ml.src.training.metrics import compute_expected_calibration_error, evaluate_predictions


def test_custom_cnn_shape_and_grad():
    """Verify custom CNN output shape, feature extraction, and backward pass."""
    model = CustomBaselineCNN(num_classes=NUM_CLASSES)
    x = torch.randn(2, 3, 224, 224)
    logits = model(x)

    assert logits.shape == (2, NUM_CLASSES), f"Expected shape (2, {NUM_CLASSES}), got {logits.shape}"

    features = model.get_penultimate_features(x)
    assert features.shape == (2, 256), f"Expected features shape (2, 256), got {features.shape}"

    # Gradient flow check
    loss = logits.sum()
    loss.backward()
    grad_norm = sum(p.grad.norm().item() for p in model.parameters() if p.grad is not None)
    assert grad_norm > 0, "Gradients failed to flow during backward pass"


def test_mobilenet_v3_shape_and_features():
    """Verify MobileNetV3-Large forward pass and feature extraction."""
    model = build_model("mobilenet_v3_large", num_classes=NUM_CLASSES, pretrained=False)
    x = torch.randn(2, 3, 224, 224)
    logits = model(x)

    assert logits.shape == (2, NUM_CLASSES), f"Expected shape (2, {NUM_CLASSES}), got {logits.shape}"

    features = model.extract_features(x)
    assert features.shape == (2, 960), f"Expected features shape (2, 960), got {features.shape}"


def test_efficientnet_b0_shape_and_features():
    """Verify EfficientNet-B0 forward pass and feature extraction."""
    model = build_model("efficientnet_b0", num_classes=NUM_CLASSES, pretrained=False)
    x = torch.randn(2, 3, 224, 224)
    logits = model(x)

    assert logits.shape == (2, NUM_CLASSES), f"Expected shape (2, {NUM_CLASSES}), got {logits.shape}"

    features = model.extract_features(x)
    assert features.shape == (2, 1280), f"Expected features shape (2, 1280), got {features.shape}"


def test_ece_calibration_metric():
    """Verify Expected Calibration Error mathematical properties."""
    # Perfectly calibrated case: 100% confidence, 100% accurate
    y_true = np.array([0, 1, 2, 0])
    y_probs = np.zeros((4, 3))
    for i, t in enumerate(y_true):
        y_probs[i, t] = 1.0

    ece, details = compute_expected_calibration_error(y_true, y_probs)
    assert abs(ece) < 1e-5, f"Perfect predictions must have ECE near 0, got {ece}"

    # Severely miscalibrated case: 100% confident, 100% incorrect
    y_probs_wrong = np.zeros((4, 3))
    for i, t in enumerate(y_true):
        y_probs_wrong[i, (t + 1) % 3] = 1.0

    ece_wrong, _ = compute_expected_calibration_error(y_true, y_probs_wrong)
    assert ece_wrong > 0.9, f"Completely miscalibrated predictions must have high ECE, got {ece_wrong}"
