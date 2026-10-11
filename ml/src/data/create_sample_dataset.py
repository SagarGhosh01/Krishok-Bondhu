"""
AgriShield AI - Sample Dataset Generator
Creates a reproducible, representative 17-class leaf dataset with realistic
symptom textures, lesion patches, healthy foliar gradients, and near-duplicate pairs.
Used for local testing, rapid smoke testing, and baseline validation.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
import numpy as np

from ml.src.data.classes import CLASS_NAMES, TAXONOMY_METADATA
from ml.src.data.split import create_leakage_free_splits


def generate_leaf_texture(
    width: int = 224,
    height: int = 224,
    crop_type: str = "Tomato",
    seed_idx: int = 0,
) -> Image.Image:
    """Generates a natural base leaf shape with veins and green foliar gradients."""
    img = Image.new("RGB", (width, height), (235, 238, 235))  # Neutral background
    draw = ImageDraw.Draw(img)

    # Foliar green tone variations by crop
    if crop_type == "Tomato":
        leaf_color = (34 + (seed_idx % 8), 135 + (seed_idx % 12), 34)
        vein_color = (46, 160 + (seed_idx % 10), 46)
    elif crop_type == "Potato":
        leaf_color = (40 + (seed_idx % 6), 118 + (seed_idx % 10), 30)
        vein_color = (60, 140, 50)
    else:  # Corn / Maize
        leaf_color = (55 + (seed_idx % 10), 155 + (seed_idx % 15), 40)
        vein_color = (75, 175, 55)

    # Varied leaf blade dimensions and slight offset based on seed_idx
    offset_x = (seed_idx * 7) % 15 - 7
    offset_y = (seed_idx * 5) % 15 - 7
    w_pad = 20 + (seed_idx % 6) * 3
    h_pad = 18 + (seed_idx % 5) * 3

    # Leaf blade ellipse
    bbox = [25 + offset_x + w_pad, 20 + offset_y + h_pad, width - 25 + offset_x - w_pad, height - 20 + offset_y - h_pad]
    draw.ellipse(bbox, fill=leaf_color)

    # Midrib vein
    center_x = width // 2 + offset_x
    draw.line([center_x, bbox[1] + 5, center_x, bbox[3] - 5], fill=vein_color, width=3)

    # Lateral veins
    spacing = 18 + (seed_idx % 5) * 2
    for y in range(bbox[1] + 15, bbox[3] - 15, spacing):
        angle_dx = 35 + (seed_idx % 4) * 4
        draw.line([center_x, y, center_x - angle_dx, y - 10], fill=vein_color, width=2)
        draw.line([center_x, y, center_x + angle_dx, y - 10], fill=vein_color, width=2)

    return img


def add_disease_symptoms(base_img: Image.Image, class_name: str, seed_idx: int = 0) -> Image.Image:
    """Simulates class-specific morphological lesions, necrosis, spots, or molds."""
    img = base_img.copy()
    draw = ImageDraw.Draw(img)
    w, h = img.size

    if "healthy" in class_name:
        return img  # Clean leaf

    rng = np.random.RandomState(abs(hash(class_name) + seed_idx * 31) % (2**31))

    if "Early_blight" in class_name or "Target_Spot" in class_name:
        # Concentric dark brown necrotic spots
        for _ in range(3):
            cx = rng.randint(w // 2 - 40, w // 2 + 40)
            cy = rng.randint(40, h - 40)
            for r, col in [(18, (60, 40, 20)), (12, (95, 65, 30)), (6, (40, 25, 10))]:
                draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

    elif "Late_blight" in class_name:
        # Water-soaked irregular rot with pale margin
        for _ in range(2):
            cx = rng.randint(w // 2 - 35, w // 2 + 35)
            cy = rng.randint(45, h - 45)
            draw.ellipse([cx - 26, cy - 24, cx + 26, cy + 24], fill=(175, 185, 135))
            draw.ellipse([cx - 18, cy - 16, cx + 18, cy + 16], fill=(45, 45, 30))

    elif "Bacterial_spot" in class_name or "Septoria_leaf_spot" in class_name:
        # Small angular/circular specks
        for _ in range(16):
            rx = rng.randint(w // 2 - 45, w // 2 + 45)
            ry = rng.randint(35, h - 35)
            draw.ellipse([rx - 5, ry - 5, rx + 5, ry + 5], fill=(210, 200, 50))
            draw.ellipse([rx - 3, ry - 3, rx + 3, ry + 3], fill=(30, 20, 10))

    elif "Common_rust" in class_name:
        # Rusty cinnamon pustules
        for _ in range(14):
            rx = rng.randint(w // 2 - 35, w // 2 + 35)
            ry = rng.randint(40, h - 40)
            draw.ellipse([rx - 6, ry - 4, rx + 6, ry + 4], fill=(165, 65, 20))

    elif "Leaf_Mold" in class_name or "Spider_mites" in class_name:
        # Yellowish chlorotic mottling
        for _ in range(2):
            cx = rng.randint(w // 2 - 30, w // 2 + 30)
            cy = rng.randint(50, h - 50)
            draw.ellipse([cx - 28, cy - 22, cx + 28, cy + 22], fill=(145, 155, 45))

    elif "Yellow_Leaf_Curl" in class_name or "mosaic_virus" in class_name:
        # Severe yellow mottling
        for _ in range(3):
            cx = rng.randint(w // 2 - 35, w // 2 + 35)
            cy = rng.randint(40, h - 40)
            draw.ellipse([cx - 20, cy - 18, cx + 20, cy + 18], fill=(205, 215, 60))

    elif "Northern_Leaf_Blight" in class_name or "Cercospora" in class_name:
        # Elongated cigar-shaped tan lesions
        for _ in range(2):
            cx = rng.randint(w // 2 - 20, w // 2 + 20)
            cy = rng.randint(50, h - 50)
            draw.rectangle([cx - 35, cy - 8, cx + 35, cy + 8], fill=(145, 135, 115))

    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))
    return img


def generate_sample_dataset(
    output_dir: Path,
    samples_per_class: int = 15,
    seed: int = 42,
) -> Path:
    """Generates synthetic dataset and intentional near-duplicate pairs."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print(f"Generating synthetic verification dataset across 17 classes at {out_path}...")

    for class_name in CLASS_NAMES:
        class_folder = out_path / class_name
        class_folder.mkdir(parents=True, exist_ok=True)
        crop = TAXONOMY_METADATA[class_name]["crop"]

        for i in range(samples_per_class):
            base = generate_leaf_texture(width=224, height=224, crop_type=crop, seed_idx=i)
            leaf_with_symptoms = add_disease_symptoms(base, class_name, seed_idx=i)

            img_file = class_folder / f"leaf_{i:03d}.jpg"
            leaf_with_symptoms.save(img_file, "JPEG", quality=95)

            # Generate near-duplicate pair for index 0 and 1
            if i in (0, 1):
                near_dup = ImageEnhance.Brightness(leaf_with_symptoms).enhance(1.02)
                dup_file = class_folder / f"leaf_{i:03d}_near_dup.jpg"
                near_dup.save(dup_file, "JPEG", quality=95)

    print("Sample dataset generation complete.")
    return out_path


if __name__ == "__main__":
    target = Path("ml/data/sample_dataset")
    generate_sample_dataset(target, samples_per_class=12)
    create_leakage_free_splits(
        dataset_dir=target,
        output_manifest_path=Path("ml/artifacts/split_manifest.json"),
        seed=42,
        hamming_threshold=2,
    )
