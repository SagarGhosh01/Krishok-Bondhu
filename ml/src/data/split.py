"""
AgriShield AI - Leakage-Aware Stratified Dataset Splitter
Ensures zero data leakage across train, val, and test splits by enforcing that perceptual
near-duplicate clusters remain strictly within the same partition using Disjoint Set Union.
"""

import json
import os
import random
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple
from collections import defaultdict

from ml.src.data.classes import CLASS_NAMES, CLASS_TO_IDX
from ml.src.data.deduplicate import (
    DuplicateDetector,
    UnionFind,
    compute_sha256,
    compute_dhash,
    hamming_distance,
)


def create_leakage_free_splits(
    dataset_dir: Path,
    output_manifest_path: Path,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
    hamming_threshold: int = 2,
) -> Dict[str, Any]:
    """
    Creates stratified, leakage-free train/val/test splits.
    Guarantees that all images in a near-duplicate perceptual cluster belong to the same split.
    Uses balanced cluster bin-packing to ensure proportional representation.
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    random.seed(seed)

    dataset_path = Path(dataset_dir)
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}

    # Step 1: Discover images belonging to target classes
    samples_by_class: Dict[str, List[Path]] = defaultdict(list)
    for class_name in CLASS_NAMES:
        class_folder = dataset_path / class_name
        if class_folder.exists() and class_folder.is_dir():
            for f in sorted(class_folder.iterdir()):
                if f.suffix.lower() in valid_exts:
                    samples_by_class[class_name].append(f)

    # Step 2: Per-class duplicate grouping via Union-Find
    split_assignments: Dict[str, List[Dict[str, Any]]] = {"train": [], "val": [], "test": []}
    class_split_counts: Dict[str, Dict[str, int]] = {c: {"train": 0, "val": 0, "test": 0} for c in CLASS_NAMES}
    manifest_records: List[Dict[str, Any]] = []

    for class_name in CLASS_NAMES:
        file_list = samples_by_class[class_name]
        if not file_list:
            continue

        # Compute dhash for all images in this class
        image_hashes: List[Tuple[Path, int, str]] = []
        for p in file_list:
            try:
                sha = compute_sha256(p)
                dh = compute_dhash(p)
                image_hashes.append((p, dh, sha))
            except Exception as e:
                print(f"[Warning] Error hashing {p}: {e}")

        n = len(image_hashes)
        if n == 0:
            continue

        # Disjoint Set Union clustering
        dsu = UnionFind(n)
        for i in range(n):
            for j in range(i + 1, n):
                if hamming_distance(image_hashes[i][1], image_hashes[j][1]) <= hamming_threshold:
                    dsu.union(i, j)

        groups: Dict[int, List[Tuple[Path, int, str]]] = defaultdict(list)
        for i in range(n):
            root_idx = dsu.find(i)
            groups[root_idx].append(image_hashes[i])

        clusters = list(groups.values())
        # Sort largest clusters first for optimal bin packing
        clusters.sort(key=lambda c: len(c), reverse=True)

        target_train = max(1, int(round(n * train_ratio)))
        target_val = max(1, int(round(n * val_ratio))) if n >= 5 else 0
        target_test = max(1, n - target_train - target_val) if n >= 5 else (n - target_train)

        targets = {"train": target_train, "val": target_val, "test": target_test}
        curr_counts = {"train": 0, "val": 0, "test": 0}

        for cluster in clusters:
            c_size = len(cluster)
            # Find candidate split with the highest deficit: (target - current)
            deficits = {s: targets[s] - curr_counts[s] for s in ["train", "val", "test"]}
            best_split = max(deficits.keys(), key=lambda s: (deficits[s], s == "train"))

            target_split = best_split
            curr_counts[target_split] += c_size

            for p, dh, sha in cluster:
                record = {
                    "rel_path": str(p.relative_to(dataset_path).as_posix()),
                    "abs_path": str(p.resolve()),
                    "class_name": class_name,
                    "class_idx": CLASS_TO_IDX[class_name],
                    "sha256": sha,
                    "dhash": dh,
                    "split": target_split,
                }
                manifest_records.append(record)
                split_assignments[target_split].append(record)
                class_split_counts[class_name][target_split] += 1

    manifest = {
        "metadata": {
            "seed": seed,
            "train_ratio": train_ratio,
            "val_ratio": val_ratio,
            "test_ratio": test_ratio,
            "hamming_threshold": hamming_threshold,
            "total_samples": len(manifest_records),
            "counts": {
                "train": len(split_assignments["train"]),
                "val": len(split_assignments["val"]),
                "test": len(split_assignments["test"]),
            },
            "class_distribution": class_split_counts,
        },
        "samples": manifest_records,
    }

    output_path = Path(output_manifest_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest
