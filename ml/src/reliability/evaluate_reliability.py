"""
AgriShield AI - Reliability, Calibration & OOD Evaluation Suite
Calibrates temperature on validation logits, fits OOD thresholds, computes AUROC,
and verifies all three diagnostic states on stress test inputs.
"""

import json
from pathlib import Path
import numpy as np
import torch
from PIL import Image, ImageFilter
from torch.utils.data import DataLoader

from ml.src.data.classes import CLASS_NAMES, NUM_CLASSES
from ml.src.data.dataset import PlantLeafDataset, get_eval_transforms
from ml.src.models.classifier import build_model
from ml.src.reliability.quality_gate import ImageQualityGate
from ml.src.reliability.calibration import TemperatureScaler
from ml.src.reliability.ood_detector import OODDetector
from ml.src.reliability.decision_engine import DecisionEngine, DiagnosticState


def run_reliability_evaluation():
    manifest_path = Path("ml/artifacts/split_manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    device = torch.device("cpu")

    # Load MobileNetV3-Large Seed 42 checkpoint
    checkpoint_path = Path("ml/artifacts/mobilenet_v3_large_seed42/best_model.pt")
    model = build_model("mobilenet_v3_large", num_classes=NUM_CLASSES, pretrained=False)
    state_dict = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(state_dict)
    model.eval()

    val_samples = [s for s in manifest["samples"] if s["split"] == "val"]
    val_ds = PlantLeafDataset(val_samples, transform=get_eval_transforms())
    val_loader = DataLoader(val_ds, batch_size=16, shuffle=False)

    # Collect validation logits and labels
    val_logits_list, val_labels_list = [], []
    with torch.no_grad():
        for images, labels, _ in val_loader:
            logits = model(images)
            val_logits_list.append(logits)
            val_labels_list.append(labels)

    val_logits = torch.cat(val_logits_list, dim=0)
    val_labels = torch.cat(val_labels_list, dim=0)

    # 1. Fit Temperature Scaler
    print("\n--- Fitting Temperature Scaling on Validation Set ---")
    scaler = TemperatureScaler()
    cal_metrics = scaler.fit(val_logits, val_labels)
    optimal_temp = cal_metrics["optimal_temperature"]

    # 2. Fit OOD Detector on In-Distribution Logits
    print("\n--- Fitting OOD Energy Threshold ---")
    ood_detector = OODDetector(energy_temperature=1.0)
    ood_threshold = ood_detector.fit_threshold(val_logits.numpy(), target_tpr=0.95)

    # Synthesize OOD non-leaf test samples (random noise)
    np.random.seed(999)
    ood_images_tensors = []
    for _ in range(30):
        noise = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        img_noise = Image.fromarray(noise)
        ood_images_tensors.append(get_eval_transforms()(img_noise))

    ood_batch = torch.stack(ood_images_tensors, dim=0)
    with torch.no_grad():
        ood_logits = model(ood_batch).numpy()

    ood_eval = ood_detector.evaluate_auroc(val_logits.numpy(), ood_logits)
    print(f"[OOD Evaluation] AUROC vs Synthetic Non-Leaf Noise: {ood_eval['auroc']:.4f}")

    # 3. Test Three Output States
    quality_gate = ImageQualityGate()
    decision_engine = DecisionEngine(
        quality_gate=quality_gate,
        ood_detector=ood_detector,
        temperature=optimal_temp,
        confidence_threshold=0.60,
        uncertainty_floor=0.25,
    )

    tested_states = {}

    # State A: Normal valid leaf -> Expect CONFIDENT or UNCERTAIN
    first_val_sample = val_samples[0]
    normal_img = Image.open(first_val_sample["abs_path"])
    normal_tensor = get_eval_transforms()(normal_img).unsqueeze(0)
    with torch.no_grad():
        raw_normal_logits = model(normal_tensor).numpy()[0]
    outcome_a = decision_engine.evaluate(normal_img, raw_normal_logits)
    tested_states["valid_leaf"] = outcome_a.state.value

    # State B: Blurry image -> Expect CANNOT_ASSESS
    blurry_img = normal_img.filter(ImageFilter.GaussianBlur(radius=8.0))
    outcome_b = decision_engine.evaluate(blurry_img, raw_normal_logits)
    tested_states["blurry_defect"] = outcome_b.state.value

    # State C: OOD Noise -> Expect CANNOT_ASSESS
    noise_img = Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
    with torch.no_grad():
        noise_tensor = get_eval_transforms()(noise_img).unsqueeze(0)
        raw_noise_logits = model(noise_tensor).numpy()[0]
    outcome_c = decision_engine.evaluate(noise_img, raw_noise_logits)
    tested_states["ood_noise"] = outcome_c.state.value

    summary = {
        "temperature_calibration": cal_metrics,
        "ood_detector": {
            "energy_threshold": ood_threshold,
            "auroc": ood_eval["auroc"],
            "mean_in_dist_energy": ood_eval["mean_in_dist_energy"],
            "mean_ood_energy": ood_eval["mean_ood_energy"],
        },
        "tested_states": tested_states,
    }

    out_file = Path("ml/artifacts/reliability_evaluation.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n[Reliability Suite Complete] Saved to {out_file}")
    print(f"Tested States: Normal={tested_states['valid_leaf']} | Blurry={tested_states['blurry_defect']} | OOD={tested_states['ood_noise']}")
    return summary


if __name__ == "__main__":
    run_reliability_evaluation()
