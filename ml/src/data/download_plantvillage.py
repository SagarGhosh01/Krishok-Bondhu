"""
AgriShield AI - PlantVillage Dataset Downloader & Preparer
Downloads PlantVillage dataset (spMohanty/PlantVillage-Dataset), filters strictly
to the 17 target classes for Tomato, Potato, and Corn, and prepares directory structure.
"""

import argparse
import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

from ml.src.data.classes import CLASS_NAMES
from ml.src.data.split import create_leakage_free_splits

# Direct archive URL for PlantVillage color dataset
PLANTVILLAGE_ZIP_URL = "https://github.com/spMohanty/PlantVillage-Dataset/archive/refs/heads/master.zip"


def download_and_extract(dest_dir: Path) -> Path:
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = dest_dir / "plantvillage_master.zip"

    print(f"Downloading PlantVillage repository from {PLANTVILLAGE_ZIP_URL}...")
    urllib.request.urlretrieve(PLANTVILLAGE_ZIP_URL, zip_path)

    print("Extracting archive...")
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(dest_dir)

    print("Extraction complete.")
    return dest_dir


def filter_target_17_classes(raw_extracted_dir: Path, target_dir: Path):
    """Filters only the 17 supported classes for Tomato, Potato, and Corn."""
    target_dir = Path(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    # Search for color folder
    color_candidates = list(raw_extracted_dir.rglob("color"))
    if not color_candidates:
        color_candidates = [raw_extracted_dir]

    source_color_dir = color_candidates[0]

    copied_counts = {}
    for class_name in CLASS_NAMES:
        source_class_dir = source_color_dir / class_name
        dest_class_dir = target_dir / class_name

        if source_class_dir.exists():
            dest_class_dir.mkdir(parents=True, exist_ok=True)
            files = list(source_class_dir.glob("*.*"))
            for f in files:
                shutil.copy2(f, dest_class_dir / f.name)
            copied_counts[class_name] = len(files)
            print(f"Copied {len(files)} images for {class_name}")
        else:
            print(f"[Warning] Class {class_name} not found in source directory.")

    return copied_counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download & prepare PlantVillage dataset")
    parser.add_argument("--dest", type=str, default="./ml/data/raw", help="Target raw directory")
    parser.add_argument("--filtered", type=str, default="./ml/data/plantvillage_17", help="Filtered 17-class directory")
    args = parser.parse_args()

    extracted = download_and_extract(Path(args.dest))
    filter_target_17_classes(extracted, Path(args.filtered))
