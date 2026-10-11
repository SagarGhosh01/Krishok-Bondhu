"""
AgriShield AI - Quantitative Foliar Lesion Segmentation & Severity Estimator
Computes necrotic/chlorotic surface damage on leaf blades according to ICAR 5-Stage Pathological Disease Index (PDI).
"""

from dataclasses import dataclass, asdict
from typing import Optional, List, Tuple
import base64
import io
import cv2
import numpy as np
from PIL import Image


@dataclass
class FoliarSeverityResult:
    foliar_area_pixels: int
    lesion_area_pixels: int
    severity_percentage: float
    severity_grade: int  # 1 to 5
    grade_label: str
    projected_yield_loss_pct: str
    lesion_spot_count: int
    contour_image_base64: Optional[str] = None

    def to_dict(self):
        return asdict(self)


def estimate_foliar_severity(
    image: np.ndarray,
    gradcam_mask: Optional[np.ndarray] = None,
    generate_overlay: bool = True
) -> FoliarSeverityResult:
    """
    Analyzes leaf lesion surface area using adaptive HSV segmentation and morphological contour detection.

    Args:
        image: RGB numpy array [H, W, 3] in 0..255.
        gradcam_mask: Optional float32 saliency mask [H, W] in 0.0..1.0.
        generate_overlay: Whether to generate a base64 visualization image.

    Returns:
        FoliarSeverityResult with quantitative metrics and ICAR severity grade.
    """
    h, w = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

    # 1. Segment green/yellow foliar blade
    lower_green = np.array([20, 25, 30], dtype=np.uint8)
    upper_green = np.array([100, 255, 255], dtype=np.uint8)
    green_mask = cv2.inRange(hsv, lower_green, upper_green)

    # 2. Segment necrotic brown/black lesions and chlorotic halos
    lower_necrotic1 = np.array([0, 35, 15], dtype=np.uint8)
    upper_necrotic1 = np.array([22, 255, 200], dtype=np.uint8)
    mask_necrotic1 = cv2.inRange(hsv, lower_necrotic1, upper_necrotic1)

    lower_necrotic2 = np.array([150, 35, 15], dtype=np.uint8)
    upper_necrotic2 = np.array([180, 255, 200], dtype=np.uint8)
    mask_necrotic2 = cv2.inRange(hsv, lower_necrotic2, upper_necrotic2)

    raw_lesion_mask = cv2.bitwise_or(mask_necrotic1, mask_necrotic2)

    # Total foliar surface includes green tissue + diseased lesions
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    total_leaf_mask = cv2.bitwise_or(green_mask, raw_lesion_mask)
    total_leaf_mask = cv2.morphologyEx(total_leaf_mask, cv2.MORPH_CLOSE, kernel)

    foliar_pixels = int(np.count_nonzero(total_leaf_mask))
    if foliar_pixels < 500:
        foliar_pixels = h * w
        total_leaf_mask = np.ones((h, w), dtype=np.uint8) * 255

    # Restrict lesions to foliar surface
    lesion_mask = cv2.bitwise_and(raw_lesion_mask, total_leaf_mask)

    # If Grad-CAM saliency is provided, boost lesions in active model attention zones
    if gradcam_mask is not None:
        if gradcam_mask.shape != (h, w):
            gradcam_resized = cv2.resize(gradcam_mask, (w, h), interpolation=cv2.INTER_LINEAR)
        else:
            gradcam_resized = gradcam_mask
        saliency_active = (gradcam_resized > 0.45).astype(np.uint8) * 255
        # Intersect with high-attention regions where color deviates from healthy green
        attention_lesions = cv2.bitwise_and(saliency_active, total_leaf_mask)
        lesion_mask = cv2.bitwise_or(lesion_mask, cv2.bitwise_and(attention_lesions, raw_lesion_mask))

    # Remove microscopic noise
    clean_lesion_mask = cv2.morphologyEx(lesion_mask, cv2.MORPH_OPEN, kernel)
    clean_lesion_mask = cv2.morphologyEx(clean_lesion_mask, cv2.MORPH_CLOSE, kernel)

    lesion_pixels = int(np.count_nonzero(clean_lesion_mask))

    # 3. Calculate percentage and ICAR 5-Stage Scale
    severity_pct = (lesion_pixels / max(1, foliar_pixels)) * 100.0
    severity_pct = float(np.clip(severity_pct, 0.0, 100.0))

    if severity_pct <= 5.0:
        grade = 1
        label = "Trace Incipient Infection"
        loss_est = "< 5% (Low Risk)"
    elif severity_pct <= 15.0:
        grade = 2
        label = "Mild Vegetative Spread"
        loss_est = "5% - 12% (Manageable)"
    elif severity_pct <= 30.0:
        grade = 3
        label = "Moderate Foliar Blight"
        loss_est = "15% - 25% (Intervention Urgent)"
    elif severity_pct <= 50.0:
        grade = 4
        label = "Severe Foliar Necrosis"
        loss_est = "30% - 50% (High Loss Risk)"
    else:
        grade = 5
        label = "Critical Canopy Defoliation"
        loss_est = "> 50% (Terminal Canopy Threat)"

    # 4. Find distinct lesion contours
    contours, _ = cv2.findContours(clean_lesion_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    significant_contours = [c for c in contours if cv2.contourArea(c) > 25]
    spot_count = len(significant_contours)

    # 5. Optional Base64 overlay generation
    overlay_b64 = None
    if generate_overlay:
        vis = image.copy()
        # Draw red contours around necrotic spots
        cv2.drawContours(vis, significant_contours, -1, (239, 68, 68), 2)
        # Semi-transparent red wash inside lesion areas
        red_tint = np.zeros_like(vis)
        red_tint[:, :] = (239, 68, 68)
        alpha_mask = (clean_lesion_mask > 0)[:, :, np.newaxis]
        vis = np.where(alpha_mask, cv2.addWeighted(vis, 0.65, red_tint, 0.35, 0), vis)

        pil_img = Image.fromarray(vis)
        buffer = io.BytesIO()
        pil_img.save(buffer, format="JPEG", quality=85)
        overlay_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"

    return FoliarSeverityResult(
        foliar_area_pixels=foliar_pixels,
        lesion_area_pixels=lesion_pixels,
        severity_percentage=round(severity_pct, 1),
        severity_grade=grade,
        grade_label=label,
        projected_yield_loss_pct=loss_est,
        lesion_spot_count=spot_count,
        contour_image_base64=overlay_b64
    )
