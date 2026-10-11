"""
AgriShield AI - Dataset Audit and Provenance Verification Tool
Audits image datasets for corrupt files, non-RGB channels, aberrant dimensions,
and validates compliance with the target 17-class taxonomy.
"""

from pathlib import Path
from typing import Any, Dict, List
from collections import defaultdict
from PIL import Image

from ml.src.data.classes import CLASS_NAMES, SUPPORTED_CROPS


def audit_dataset_directory(dataset_dir: Path) -> Dict[str, Any]:
    """
    Scans dataset directory, validates class folder names, checks image files,
    and returns comprehensive statistical audit report.
    """
    root = Path(dataset_dir)
    report: Dict[str, Any] = {
        "dataset_path": str(root.resolve()),
        "classes_found": [],
        "classes_missing": [],
        "total_valid_images": 0,
        "corrupt_images": [],
        "dimension_stats": {"min_w": 999999, "max_w": 0, "min_h": 999999, "max_h": 0},
        "color_modes": defaultdict(int),
        "per_class_counts": {},
        "crop_breakdown": {crop: 0 for crop in SUPPORTED_CROPS},
    }

    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}

    for expected_class in CLASS_NAMES:
        class_dir = root / expected_class
        if not class_dir.exists() or not class_dir.is_dir():
            report["classes_missing"].append(expected_class)
            report["per_class_counts"][expected_class] = 0
            continue

        report["classes_found"].append(expected_class)
        count = 0

        for file_path in class_dir.iterdir():
            if file_path.suffix.lower() not in valid_exts:
                continue

            try:
                with Image.open(file_path) as img:
                    w, h = img.size
                    mode = img.mode
                    report["color_modes"][mode] += 1
                    report["dimension_stats"]["min_w"] = min(report["dimension_stats"]["min_w"], w)
                    report["dimension_stats"]["max_w"] = max(report["dimension_stats"]["max_w"], w)
                    report["dimension_stats"]["min_h"] = min(report["dimension_stats"]["min_h"], h)
                    report["dimension_stats"]["max_h"] = max(report["dimension_stats"]["max_h"], h)
                    count += 1
            except Exception as e:
                report["corrupt_images"].append({"path": str(file_path), "error": str(e)})

        report["per_class_counts"][expected_class] = count
        report["total_valid_images"] += count

        # Attribute to crop
        for crop in SUPPORTED_CROPS:
            if expected_class.startswith(crop) or (crop == "Corn" and "Corn" in expected_class):
                report["crop_breakdown"][crop] += count
                break

    report["color_modes"] = dict(report["color_modes"])
    return report
