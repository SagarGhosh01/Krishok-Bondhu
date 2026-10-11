"""
AgriShield AI - Reproducible Training and Evaluation Pipeline
Implements 2-stage fine-tuning, validation checkpointing, cosine learning rate schedules,
and exports comprehensive performance artifacts without data fabrication.
"""

import argparse
import json
import os
import random
import time
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.src.data.classes import CLASS_NAMES, NUM_CLASSES
from ml.src.data.dataset import PlantLeafDataset, get_train_transforms, get_eval_transforms, compute_class_weights
from ml.src.models.classifier import build_model
from ml.src.training.metrics import evaluate_predictions


def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


def train_model(
    config: Dict[str, Any],
    manifest_path: Path,
    output_dir: Path,
) -> Dict[str, Any]:
    """
    Executes training and evaluation pipeline according to supplied configuration.
    """
    seed = config.get("seed", 42)
    set_seed(seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Executing run on device: {device}")

    # Load split manifest
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    samples = manifest["samples"]
    train_samples = [s for s in samples if s["split"] == "train"]
    val_samples = [s for s in samples if s["split"] == "val"]
    test_samples = [s for s in samples if s["split"] == "test"]

    print(f"Dataset partitions: Train={len(train_samples)}, Val={len(val_samples)}, Test={len(test_samples)}")

    # Data loaders
    batch_size = config.get("batch_size", 16)
    train_ds = PlantLeafDataset(train_samples, transform=get_train_transforms())
    val_ds = PlantLeafDataset(val_samples, transform=get_eval_transforms())
    test_ds = PlantLeafDataset(test_samples, transform=get_eval_transforms())

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Initialize model
    backbone = config.get("backbone", "mobilenet_v3_large")
    pretrained = config.get("pretrained", True)
    model = build_model(
        backbone_name=backbone,
        num_classes=NUM_CLASSES,
        pretrained=pretrained,
        dropout_rate=config.get("dropout", 0.2),
    ).to(device)

    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    # Loss with label smoothing
    label_smoothing = config.get("label_smoothing", 0.05)
    criterion = nn.CrossEntropyLoss(label_smoothing=label_smoothing)

    epochs = config.get("epochs", 8)
    lr = config.get("lr", 1e-3)
    warmup_epochs = config.get("warmup_epochs", 2) if pretrained and backbone != "custom_cnn" else 0

    if warmup_epochs > 0:
        model.freeze_backbone()
        optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=lr, weight_decay=1e-4)
    else:
        optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)

    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {"train_loss": [], "val_loss": [], "val_accuracy": [], "val_macro_f1": []}
    best_val_loss = float("inf")
    best_model_weights = None

    run_dir = Path(output_dir)
    run_dir.mkdir(parents=True, exist_ok=True)

    start_time = time.time()

    for epoch in range(1, epochs + 1):
        if epoch == warmup_epochs + 1 and warmup_epochs > 0:
            print(f"--- Epoch {epoch}: Unfreezing backbone for fine-tuning ---")
            model.unfreeze_backbone()
            # Lower learning rate for fine-tuning
            optimizer = torch.optim.AdamW(model.parameters(), lr=lr * 0.1, weight_decay=1e-4)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=(epochs - warmup_epochs))

        # Train loop
        model.train()
        running_loss = 0.0
        for images, labels, _ in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * images.size(0)

        scheduler.step()
        train_epoch_loss = running_loss / max(1, len(train_samples))

        # Validation loop
        model.eval()
        val_loss = 0.0
        val_preds, val_targets = [], []
        with torch.no_grad():
            for images, labels, _ in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                probs = torch.softmax(outputs, dim=1).cpu().numpy()
                val_preds.append(probs)
                val_targets.append(labels.cpu().numpy())

        val_epoch_loss = val_loss / max(1, len(val_samples))
        val_probs_arr = np.concatenate(val_preds, axis=0) if val_preds else np.zeros((0, NUM_CLASSES))
        val_targets_arr = np.concatenate(val_targets, axis=0) if val_targets else np.zeros((0,))

        val_metrics = evaluate_predictions(val_targets_arr, val_probs_arr, CLASS_NAMES) if len(val_targets_arr) > 0 else {}
        val_acc = val_metrics.get("top1_accuracy", 0.0)
        val_f1 = val_metrics.get("macro_f1", 0.0)

        history["train_loss"].append(train_epoch_loss)
        history["val_loss"].append(val_epoch_loss)
        history["val_accuracy"].append(val_acc)
        history["val_macro_f1"].append(val_f1)

        print(f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {train_epoch_loss:.4f} | Val Loss: {val_epoch_loss:.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}")

        # Checkpointing
        if val_epoch_loss < best_val_loss:
            best_val_loss = val_epoch_loss
            best_model_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            torch.save(best_model_weights, run_dir / "best_model.pt")

    train_duration = time.time() - start_time

    # Load best checkpoint for testing
    if best_model_weights:
        model.load_state_dict(best_model_weights)
    model.eval()

    # Test evaluation & latency benchmark
    test_preds, test_targets = [], []
    latencies = []
    with torch.no_grad():
        for images, labels, _ in test_loader:
            images, labels = images.to(device), labels.to(device)
            t0 = time.perf_counter()
            outputs = model(images)
            latencies.append((time.perf_counter() - t0) / max(1, images.size(0)))
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            test_preds.append(probs)
            test_targets.append(labels.cpu().numpy())

    test_probs_arr = np.concatenate(test_preds, axis=0)
    test_targets_arr = np.concatenate(test_targets, axis=0)
    test_results = evaluate_predictions(test_targets_arr, test_probs_arr, CLASS_NAMES)

    avg_latency_ms = float(np.mean(latencies) * 1000.0) if latencies else 0.0
    model_size_mb = float(os.path.getsize(run_dir / "best_model.pt") / (1024 * 1024)) if (run_dir / "best_model.pt").exists() else 0.0

    summary = {
        "run_id": run_dir.name,
        "backbone": backbone,
        "seed": seed,
        "total_parameters": total_params,
        "model_size_mb": model_size_mb,
        "device": str(device),
        "train_duration_sec": train_duration,
        "inference_latency_ms": avg_latency_ms,
        "test_metrics": test_results,
        "history": history,
        "config": config,
    }

    # Save summary artifacts
    with open(run_dir / "test_evaluation.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    with open(run_dir / "run_config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    print(f"\n[Run {run_dir.name} Finished] Test Accuracy: {test_results['top1_accuracy']:.4f} | Macro-F1: {test_results['macro_f1']:.4f} | ECE: {test_results['expected_calibration_error']:.4f} | Latency: {avg_latency_ms:.2f} ms")

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backbone", type=str, default="mobilenet_v3_large")
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output-dir", type=str, default="./ml/artifacts/run_default")
    args = parser.parse_args()

    cfg = {
        "backbone": args.backbone,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "lr": args.lr,
        "seed": args.seed,
    }
    train_model(cfg, Path("ml/artifacts/split_manifest.json"), Path(args.output_dir))
