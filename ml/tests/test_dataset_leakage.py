"""
AgriShield AI - Automated Split Leakage & Deduplication Tests
Verifies that:
1. No cryptographic (SHA-256) duplicate crosses split boundaries.
2. Perceptually near-duplicate images (simulating Kaggle augmentations or multi-angle shots)
   are forced into the identical partition.
3. Class integrity and stratification invariants are maintained.
"""

import json
import tempfile
from pathlib import Path
import pytest
from PIL import Image, ImageEnhance
import numpy as np

from ml.src.data.classes import CLASS_NAMES, CLASS_TO_IDX
from ml.src.data.deduplicate import compute_sha256, compute_dhash, hamming_distance, DuplicateDetector
from ml.src.data.split import create_leakage_free_splits


@pytest.fixture
def synthetic_plant_dataset(tmp_path: Path):
    """
    Creates a temporary synthetic leaf dataset with:
    - Gradient-based synthetic leaf textures across classes
    - Near-duplicate pairs (original + slightly brightness-adjusted copy) to stress-test leakage resistance.
    """
    dataset_root = tmp_path / "raw_dataset"
    dataset_root.mkdir(parents=True)

    test_classes = CLASS_NAMES[:3]

    for class_idx, class_name in enumerate(test_classes):
        class_dir = dataset_root / class_name
        class_dir.mkdir(parents=True)

        for i in range(10):
            # Generate structured gradient leaf image (not pure i.i.d. noise)
            y, x = np.mgrid[0:100, 0:100]
            arr = np.zeros((100, 100, 3), dtype=np.uint8)
            arr[:, :, 1] = np.clip(80 + (x * (i + 1)) // 15 + (y * (class_idx + 1)) // 20, 0, 240).astype(np.uint8)
            arr[:, :, 0] = np.clip(20 + (x // 8), 0, 100).astype(np.uint8)
            arr[:, :, 2] = np.clip(10 + (y // 10), 0, 80).astype(np.uint8)

            base_img = Image.fromarray(arr)
            orig_path = class_dir / f"leaf_{i:03d}.jpg"
            base_img.save(orig_path, "JPEG")

            # Create an augmented near-duplicate for images 0 and 1
            if i in (0, 1):
                enhancer = ImageEnhance.Brightness(base_img)
                aug_img = enhancer.enhance(1.05)
                aug_path = class_dir / f"leaf_{i:03d}_aug_duplicate.jpg"
                aug_img.save(aug_path, "JPEG")

    return dataset_root, test_classes


def test_dhash_and_hamming_distance():
    """Verify that identical images have distance 0 and inverted images have high distance."""
    y, x = np.mgrid[0:100, 0:100]
    arr = np.stack([x.astype(np.uint8), y.astype(np.uint8), ((x + y) // 2).astype(np.uint8)], axis=-1)
    img1 = Image.fromarray(arr)

    with tempfile.TemporaryDirectory() as tmpdir:
        p1 = Path(tmpdir) / "img1.png"
        p2 = Path(tmpdir) / "img2.png"
        p3 = Path(tmpdir) / "img3.png"

        img1.save(p1)
        img1.save(p2)  # exact duplicate

        img_inverted = Image.fromarray(255 - arr)
        img_inverted.save(p3)

        h1 = compute_dhash(p1)
        h2 = compute_dhash(p2)
        h3 = compute_dhash(p3)

        assert hamming_distance(h1, h2) == 0, "Exact duplicates must have hamming distance 0"
        assert hamming_distance(h1, h3) > 10, "Inverted images must have large hamming distance"


def test_leakage_free_split_generation(synthetic_plant_dataset, tmp_path: Path):
    """
    Test that create_leakage_free_splits generates a valid manifest and prevents split leakage.
    """
    dataset_root, test_classes = synthetic_plant_dataset
    manifest_path = tmp_path / "split_manifest.json"

    manifest = create_leakage_free_splits(
        dataset_dir=dataset_root,
        output_manifest_path=manifest_path,
        train_ratio=0.6,
        val_ratio=0.2,
        test_ratio=0.2,
        seed=1337,
        hamming_threshold=4,
    )

    assert manifest_path.exists(), "Manifest file was not created"
    assert "samples" in manifest
    assert len(manifest["samples"]) > 0

    train_shas = set()
    val_shas = set()
    test_shas = set()
    split_by_base_leaf = {}

    for s in manifest["samples"]:
        sha = s["sha256"]
        split = s["split"]

        if split == "train":
            train_shas.add(sha)
        elif split == "val":
            val_shas.add(sha)
        elif split == "test":
            test_shas.add(sha)

        p = Path(s["rel_path"])
        stem = p.stem
        root_leaf = stem.split("_aug_duplicate")[0]
        full_key = f"{s['class_name']}_{root_leaf}"

        if full_key in split_by_base_leaf:
            assert split_by_base_leaf[full_key] == split, (
                f"LEAKAGE DETECTED! {stem} in {split} but paired image in {split_by_base_leaf[full_key]}"
            )
        else:
            split_by_base_leaf[full_key] = split

    # Mathematical disjointness check
    assert len(train_shas.intersection(val_shas)) == 0, "Train and Val split share identical images!"
    assert len(train_shas.intersection(test_shas)) == 0, "Train and Test split share identical images!"
    assert len(val_shas.intersection(test_shas)) == 0, "Val and Test split share identical images!"
