"""
AgriShield AI - Automated Model Export & Parity Tests
Verifies that:
1. Exported ONNX model runs on ONNX Runtime without error.
2. Numerical divergence between PyTorch and ONNX is strictly within tolerance (< 1e-4).
3. INT8 quantized model executes properly and produces valid class logits.
4. Deployment metadata manifest contains all requisite thresholds and checksums.
"""

import json
from pathlib import Path
import pytest
import numpy as np
import torch
import onnxruntime as ort

from ml.src.data.classes import NUM_CLASSES
from ml.src.models.classifier import build_model
from ml.export.export_onnx import export_model_to_onnx


@pytest.fixture(scope="module")
def exported_bundle(tmp_path_factory):
    """Generates an exported model bundle in a temp directory for parity testing."""
    tmp_dir = tmp_path_factory.mktemp("export_test")
    ckpt_path = Path("ml/artifacts/mobilenet_v3_large_seed42/best_model.pt")

    if not ckpt_path.exists():
        pytest.skip("Model checkpoint not found. Run training before export test.")

    metadata = export_model_to_onnx(
        checkpoint_path=ckpt_path,
        output_dir=tmp_dir,
        backbone_name="mobilenet_v3_large",
    )
    return tmp_dir, metadata


def test_export_files_exist(exported_bundle):
    tmp_dir, metadata = exported_bundle
    assert (tmp_dir / "model.onnx").exists(), "FP32 ONNX model missing"
    assert (tmp_dir / "model_int8.onnx").exists(), "INT8 ONNX model missing"
    assert (tmp_dir / "metadata.json").exists(), "Deployment metadata JSON missing"


def test_numerical_parity_tolerance(exported_bundle):
    tmp_dir, metadata = exported_bundle
    onnx_path = tmp_dir / "model.onnx"
    ckpt_path = Path("ml/artifacts/mobilenet_v3_large_seed42/best_model.pt")

    # PyTorch inference
    model = build_model("mobilenet_v3_large", num_classes=NUM_CLASSES, pretrained=False)
    model.load_state_dict(torch.load(ckpt_path, map_location="cpu"))
    model.eval()

    # ONNX Runtime inference
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])

    # Test across 5 random inputs
    np.random.seed(42)
    for _ in range(5):
        sample = np.random.randn(1, 3, 224, 224).astype(np.float32)
        with torch.no_grad():
            pt_out = model(torch.from_numpy(sample)).numpy()

        ort_out = session.run(None, {"input": sample})[0]

        max_abs_err = np.max(np.abs(pt_out - ort_out))
        assert max_abs_err < 1e-4, f"Parity tolerance exceeded: error={max_abs_err}"


def test_int8_inference(exported_bundle):
    tmp_dir, metadata = exported_bundle
    int8_path = tmp_dir / "model_int8.onnx"

    session = ort.InferenceSession(str(int8_path), providers=["CPUExecutionProvider"])
    sample = np.random.randn(1, 3, 224, 224).astype(np.float32)
    out = session.run(None, {"input": sample})[0]

    assert out.shape == (1, NUM_CLASSES)
    assert not np.isnan(out).any(), "INT8 output contains NaNs"


def test_metadata_completeness(exported_bundle):
    tmp_dir, metadata = exported_bundle
    assert metadata["model_version"] == "1.0.0"
    assert len(metadata["classes"]) == NUM_CLASSES
    assert "temperature" in metadata["calibration"]
    assert "ood_energy_threshold" in metadata["reliability_thresholds"]
    assert "sha256" in metadata["artifacts"]["fp32"]
    assert "sha256" in metadata["artifacts"]["int8"]
