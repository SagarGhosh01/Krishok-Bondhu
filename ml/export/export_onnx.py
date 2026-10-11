"""
AgriShield AI - Production Model Export & Quantization Pipeline
Exports trained PyTorch weights to ONNX (FP32 & INT8 dynamic quantization),
generates deployment metadata JSON, computes SHA-256 hashes, and conducts parity tests.
"""

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import Dict, Any

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import numpy as np
import torch
import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

from ml.src.data.classes import CLASS_NAMES, NUM_CLASSES
from ml.src.models.classifier import build_model
from ml.src.data.dataset import IMAGENET_MEAN, IMAGENET_STD


def compute_file_sha256(path: Path) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def export_model_to_onnx(
    checkpoint_path: Path,
    output_dir: Path,
    backbone_name: str = "mobilenet_v3_large",
    reliability_metrics_path: Path = Path("ml/artifacts/reliability_evaluation.json"),
) -> Dict[str, Any]:
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n[Export] Loading model checkpoint from {checkpoint_path}...")
    model = build_model(backbone_name=backbone_name, num_classes=NUM_CLASSES, pretrained=False)
    state_dict = torch.load(checkpoint_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    # Load calibration & reliability metadata
    temp_val = 1.0
    ood_threshold = -3.3
    if reliability_metrics_path.exists():
        with open(reliability_metrics_path, "r", encoding="utf-8") as f:
            rel_data = json.load(f)
            temp_val = rel_data.get("temperature_calibration", {}).get("optimal_temperature", 1.0)
            ood_threshold = rel_data.get("ood_detector", {}).get("energy_threshold", -3.3)

    # 1. Export FP32 ONNX
    onnx_fp32_path = out_dir / "model.onnx"
    dummy_input = torch.randn(1, 3, 224, 224, dtype=torch.float32)

    print(f"[Export] Exporting FP32 model to {onnx_fp32_path}...")
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_fp32_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch_size"}, "logits": {0: "batch_size"}},
        dynamo=False,
    )

    # Check validity with ONNX checker
    onnx_model = onnx.load(str(onnx_fp32_path))
    onnx.checker.check_model(onnx_model)
    fp32_size_mb = float(os.path.getsize(onnx_fp32_path) / (1024 * 1024))
    fp32_hash = compute_file_sha256(onnx_fp32_path)
    print(f"[Export] FP32 ONNX valid. Size: {fp32_size_mb:.2f} MB | SHA-256: {fp32_hash[:16]}...")

    # 2. Dynamic INT8 Quantization for Edge / WASM
    onnx_int8_path = out_dir / "model_int8.onnx"
    print(f"[Export] Quantizing to INT8 dynamic: {onnx_int8_path}...")
    quantize_dynamic(
        model_input=str(onnx_fp32_path),
        model_output=str(onnx_int8_path),
        weight_type=QuantType.QUInt8,
    )
    int8_size_mb = float(os.path.getsize(onnx_int8_path) / (1024 * 1024))
    int8_hash = compute_file_sha256(onnx_int8_path)
    print(f"[Export] INT8 ONNX generated. Size: {int8_size_mb:.2f} MB (Compression: {(1 - int8_size_mb/fp32_size_mb)*100:.1f}%) | SHA-256: {int8_hash[:16]}...")

    # 3. Numerical Parity Check
    print("[Export] Verifying numerical parity between PyTorch and ONNX Runtime...")
    ort_session = ort.InferenceSession(str(onnx_fp32_path), providers=["CPUExecutionProvider"])
    test_np = np.random.randn(1, 3, 224, 224).astype(np.float32)

    with torch.no_grad():
        pt_logits = model(torch.from_numpy(test_np)).numpy()

    ort_logits = ort_session.run(None, {"input": test_np})[0]
    max_diff = float(np.max(np.abs(pt_logits - ort_logits)))
    print(f"[Parity] Maximum absolute discrepancy: {max_diff:.8f}")
    assert max_diff < 1e-4, f"Parity tolerance exceeded! max_diff={max_diff}"

    # 4. Generate Metadata Manifest
    metadata = {
        "model_version": "1.0.0",
        "backbone": backbone_name,
        "input_tensor": {
            "name": "input",
            "shape": [1, 3, 224, 224],
            "dtype": "float32",
            "mean": IMAGENET_MEAN,
            "std": IMAGENET_STD,
        },
        "output_tensor": {
            "name": "logits",
            "num_classes": NUM_CLASSES,
        },
        "classes": CLASS_NAMES,
        "calibration": {
            "temperature": temp_val,
            "method": "temperature_scaling",
        },
        "reliability_thresholds": {
            "ood_energy_threshold": ood_threshold,
            "min_blur_score": 80.0,
            "min_luminance": 35.0,
            "max_luminance": 230.0,
            "min_dimension": 150,
            "confident_threshold": 0.65,
            "uncertainty_floor": 0.25,
        },
        "artifacts": {
            "fp32": {
                "filename": "model.onnx",
                "size_mb": fp32_size_mb,
                "sha256": fp32_hash,
            },
            "int8": {
                "filename": "model_int8.onnx",
                "size_mb": int8_size_mb,
                "sha256": int8_hash,
            },
        },
        "parity_max_diff": max_diff,
        "exported_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    metadata_path = out_dir / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Export] Saved metadata manifest to {metadata_path}")
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default="ml/artifacts/mobilenet_v3_large_seed42/best_model.pt")
    parser.add_argument("--output-dir", type=str, default="ml/artifacts/deployed")
    args = parser.parse_args()

    export_model_to_onnx(Path(args.checkpoint), Path(args.output_dir))
