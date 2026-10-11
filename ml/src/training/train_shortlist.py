"""
AgriShield AI - Candidate Model Benchmarking & Multi-Seed Experiment Runner
Runs real training and evaluation across:
1. Custom CNN Baseline (from scratch)
2. MobileNetV3-Large (Seeds 42, 1337, 2026)
3. EfficientNet-B0 (Seed 42)
Aggregates exact empirical metrics (Mean ± Std Dev) and updates scorecard.
"""

import json
from pathlib import Path
import numpy as np

from ml.src.training.train import train_model


def run_benchmarks():
    manifest_path = Path("ml/artifacts/split_manifest.json")
    artifacts_dir = Path("ml/artifacts")
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    experiments = [
        # 1. Custom CNN Baseline
        {
            "name": "custom_cnn_seed42",
            "config": {
                "backbone": "custom_cnn",
                "pretrained": False,
                "epochs": 5,
                "batch_size": 16,
                "lr": 1e-3,
                "seed": 42,
            },
        },
        # 2. MobileNetV3-Large 3-Seed Runs
        {
            "name": "mobilenet_v3_large_seed42",
            "config": {
                "backbone": "mobilenet_v3_large",
                "pretrained": True,
                "epochs": 5,
                "batch_size": 16,
                "lr": 1e-3,
                "seed": 42,
            },
        },
        {
            "name": "mobilenet_v3_large_seed1337",
            "config": {
                "backbone": "mobilenet_v3_large",
                "pretrained": True,
                "epochs": 5,
                "batch_size": 16,
                "lr": 1e-3,
                "seed": 1337,
            },
        },
        {
            "name": "mobilenet_v3_large_seed2026",
            "config": {
                "backbone": "mobilenet_v3_large",
                "pretrained": True,
                "epochs": 5,
                "batch_size": 16,
                "lr": 1e-3,
                "seed": 2026,
            },
        },
        # 3. EfficientNet-B0
        {
            "name": "efficientnet_b0_seed42",
            "config": {
                "backbone": "efficientnet_b0",
                "pretrained": True,
                "epochs": 5,
                "batch_size": 16,
                "lr": 1e-3,
                "seed": 42,
            },
        },
    ]

    results = {}

    for exp in experiments:
        name = exp["name"]
        print(f"\n========================================================")
        print(f"Starting Experiment: {name}")
        print(f"========================================================")
        exp_out_dir = artifacts_dir / name
        summary = train_model(exp["config"], manifest_path, exp_out_dir)
        results[name] = summary

    # Aggregate MobileNetV3 multi-seed metrics
    mbv3_runs = [results[f"mobilenet_v3_large_seed{s}"] for s in [42, 1337, 2026]]
    mbv3_accs = [r["test_metrics"]["top1_accuracy"] for r in mbv3_runs]
    mbv3_f1s = [r["test_metrics"]["macro_f1"] for r in mbv3_runs]
    mbv3_eces = [r["test_metrics"]["expected_calibration_error"] for r in mbv3_runs]
    mbv3_latencies = [r["inference_latency_ms"] for r in mbv3_runs]

    aggregated = {
        "experiments": results,
        "mobilenet_v3_3seed_aggregate": {
            "accuracy_mean": float(np.mean(mbv3_accs)),
            "accuracy_std": float(np.std(mbv3_accs)),
            "macro_f1_mean": float(np.mean(mbv3_f1s)),
            "macro_f1_std": float(np.std(mbv3_f1s)),
            "ece_mean": float(np.mean(mbv3_eces)),
            "ece_std": float(np.std(mbv3_eces)),
            "latency_ms_mean": float(np.mean(mbv3_latencies)),
            "latency_ms_std": float(np.std(mbv3_latencies)),
        },
    }

    with open(artifacts_dir / "shortlist_results.json", "w", encoding="utf-8") as f:
        json.dump(aggregated, f, indent=2)

    print("\n========================================================")
    print("ALL EXPERIMENTS COMPLETED SUCCESSFULLY!")
    print(f"MobileNetV3 3-Seed Mean Macro-F1: {aggregated['mobilenet_v3_3seed_aggregate']['macro_f1_mean']:.4f} ± {aggregated['mobilenet_v3_3seed_aggregate']['macro_f1_std']:.4f}")
    print(f"MobileNetV3 3-Seed Mean Latency:  {aggregated['mobilenet_v3_3seed_aggregate']['latency_ms_mean']:.2f} ± {aggregated['mobilenet_v3_3seed_aggregate']['latency_ms_std']:.2f} ms")
    print("========================================================")

    return aggregated


if __name__ == "__main__":
    run_benchmarks()
