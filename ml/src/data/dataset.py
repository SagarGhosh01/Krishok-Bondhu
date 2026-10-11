"""
AgriShield AI - PyTorch Dataset & Train-Only Augmentation Pipeline
Implements conservative, symptom-preserving data augmentation for training,
deterministic evaluation pipelines, and inverse-frequency class weighting.
"""

from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
import json
import torch
from torch.utils.data import Dataset
from torchvision import transforms
from PIL import Image
import numpy as np

# ImageNet channel-wise statistics for standard transfer learning backbones
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_train_transforms(image_size: int = 224) -> transforms.Compose:
    """
    Train transforms with conservative data augmentation:
    - RandomResizedCrop with scale in (0.8, 1.0) to prevent chopping off isolated leaf lesions
    - Horizontal and Vertical Flips (leaf geometry is rotationally invariant)
    - Moderate rotation (-20 to +20 degrees)
    - Gentle ColorJitter (brightness, contrast, saturation +/- 0.15, no hue distortion to preserve chlorosis cues)
    - Normalization with ImageNet statistics
    """
    return transforms.Compose([
        transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=20),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15, hue=0.03),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def get_eval_transforms(image_size: int = 224) -> transforms.Compose:
    """
    Deterministic evaluation transforms for validation, testing, and production inference.
    """
    return transforms.Compose([
        transforms.Resize(int(image_size * 1.14)),  # e.g., 256 for 224x224
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


class PlantLeafDataset(Dataset):
    """
    PyTorch Dataset loading samples from a split manifest dictionary or list of records.
    """

    def __init__(
        self,
        samples: List[Dict[str, Any]],
        transform: Optional[Callable] = None,
        base_dir: Optional[Path] = None,
    ):
        self.samples = samples
        self.transform = transform
        self.base_dir = Path(base_dir) if base_dir else None

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int, str]:
        record = self.samples[idx]
        image_path = record.get("abs_path")
        if not image_path and self.base_dir and record.get("rel_path"):
            image_path = str(self.base_dir / record["rel_path"])

        try:
            with Image.open(image_path) as img:
                img_rgb = img.convert("RGB")
        except Exception as e:
            raise RuntimeError(f"Failed to load image at {image_path}: {e}")

        if self.transform:
            tensor = self.transform(img_rgb)
        else:
            tensor = transforms.ToTensor()(img_rgb)

        label = record["class_idx"]
        return tensor, label, record["class_name"]


def compute_class_weights(
    samples: List[Dict[str, Any]],
    num_classes: int = 17,
    smoothing: float = 0.1,
) -> torch.Tensor:
    """
    Computes inverse class frequencies for cross-entropy loss weighting:
    w_c = N / (K * N_c) with optional smoothing to handle imbalanced datasets.
    """
    counts = np.zeros(num_classes, dtype=np.float32)
    for s in samples:
        counts[s["class_idx"]] += 1.0

    total_samples = len(samples)
    # Add smoothing to avoid division by zero
    counts = counts + smoothing
    weights = total_samples / (num_classes * counts)
    # Normalize weights so mean is 1.0
    weights = weights / np.mean(weights)
    return torch.tensor(weights, dtype=torch.float32)
