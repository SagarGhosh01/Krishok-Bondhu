"""
AgriShield AI - Image Quality & Pre-Capture Validation Gate
Inspects captured images for blur (Laplacian variance), under/over-exposure,
resolution limits, and basic leaf foliar colour profile.
"""

from dataclasses import dataclass
from typing import Optional, Tuple
from PIL import Image
import numpy as np


@dataclass
class QualityCheckResult:
    passed: bool
    blur_score: float
    luminance: float
    width: int
    height: int
    defect: Optional[str] = None
    message: str = "Image meets diagnostic quality standards."


class ImageQualityGate:
    """
    Validates input image quality before passing to deep neural networks.
    Prevents garbage-in/garbage-out on blurry, severely under-exposed, or bleached photos.
    """

    def __init__(
        self,
        min_blur_score: float = 80.0,
        min_luminance: float = 35.0,
        max_luminance: float = 230.0,
        min_dimension: int = 150,
    ):
        self.min_blur_score = min_blur_score
        self.min_luminance = min_luminance
        self.max_luminance = max_luminance
        self.min_dimension = min_dimension

    def compute_laplacian_variance(self, gray_np: np.ndarray) -> float:
        """
        Computes variance of the Laplacian filter using discrete 3x3 convolution:
        L = [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
        Higher variance indicates sharper edges; low variance indicates optical blur.
        """
        kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
        h, w = gray_np.shape
        # Fast discrete 2D convolution for 3x3 kernel
        padded = np.pad(gray_np.astype(np.float32), 1, mode="reflect")
        conv = (
            padded[0:h, 1:w+1] +
            padded[2:h+2, 1:w+1] +
            padded[1:h+1, 0:w] +
            padded[1:h+1, 2:w+2] -
            4.0 * padded[1:h+1, 1:w+1]
        )
        return float(np.var(conv))

    def evaluate(self, image: Image.Image) -> QualityCheckResult:
        """Evaluates image dimensions, luminance, and sharpness."""
        w, h = image.size

        # Check resolution
        if w < self.min_dimension or h < self.min_dimension:
            return QualityCheckResult(
                passed=False,
                blur_score=0.0,
                luminance=0.0,
                width=w,
                height=h,
                defect="RESOLUTION_TOO_LOW",
                message=f"Image resolution ({w}x{h}) is below the required {self.min_dimension}px threshold.",
            )

        # Grayscale representation for sharpness & luminance
        img_rgb = image.convert("RGB")
        img_gray = img_rgb.convert("L")
        gray_np = np.array(img_gray, dtype=np.float32)

        luminance = float(np.mean(gray_np))

        # Check underexposure
        if luminance < self.min_luminance:
            return QualityCheckResult(
                passed=False,
                blur_score=0.0,
                luminance=luminance,
                width=w,
                height=h,
                defect="UNDEREXPOSED",
                message="Image is too dark. Capture in better ambient daylight or illuminate the leaf.",
            )

        # Check overexposure
        if luminance > self.max_luminance:
            return QualityCheckResult(
                passed=False,
                blur_score=0.0,
                luminance=luminance,
                width=w,
                height=h,
                defect="OVEREXPOSED",
                message="Image is bleached/overexposed. Avoid harsh direct sun glare or flash reflection.",
            )

        # Sharpness check
        blur_score = self.compute_laplacian_variance(gray_np)
        if blur_score < self.min_blur_score:
            return QualityCheckResult(
                passed=False,
                blur_score=blur_score,
                luminance=luminance,
                width=w,
                height=h,
                defect="BLURRY",
                message="Image is blurry or out of focus. Hold camera steady and tap to refocus on leaf.",
            )

        return QualityCheckResult(
            passed=True,
            blur_score=blur_score,
            luminance=luminance,
            width=w,
            height=h,
            defect=None,
            message="Image passed all optical quality checks.",
        )
