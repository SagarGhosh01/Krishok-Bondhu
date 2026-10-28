"""
AgriShield AI - Quantitative Foliar Pathology, Discoloration & Lesion Severity Estimator
Analyzes foliar chlorophyll breakdown, chlorosis (yellowing), necrotic lesion coverage,
and ICAR 5-Stage Pathological Disease Index (PDI) with visual diagnostic overlay.
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
    healthy_green_pct: float = 100.0
    chlorosis_yellow_pct: float = 0.0
    necrosis_brown_pct: float = 0.0
    discoloration_type: str = "Uniform Photosynthetic Pigment"
    discoloration_diagnosis: str = "Leaf shows normal photosynthetic coloration without pathological discoloration."
    discoloration_level: str = "Trace"

    def to_dict(self):
        return asdict(self)


def estimate_foliar_severity(
    image: np.ndarray,
    gradcam_mask: Optional[np.ndarray] = None,
    generate_overlay: bool = True
) -> FoliarSeverityResult:
    """
    Analyzes leaf foliar discoloration and lesion surface area using multi-spectral
    HSV segmentation, adaptive thresholding, and morphological contour detection.

    Args:
        image: RGB numpy array [H, W, 3] in 0..255.
        gradcam_mask: Optional float32 saliency mask [H, W] in 0.0..1.0.
        generate_overlay: Whether to generate a base64 visualization image.

    Returns:
        FoliarSeverityResult with quantitative metrics, discoloration diagnosis, and ICAR severity grade.
    """
    h, w = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)

    # 1. Segment Healthy Green Foliar Tissue
    lower_green = np.array([25, 30, 30], dtype=np.uint8)
    upper_green = np.array([88, 255, 255], dtype=np.uint8)
    green_mask = cv2.inRange(hsv, lower_green, upper_green)

    # 2. Segment Chlorosis / Foliar Yellowing (loss of chlorophyll / nutrient / mosaic / halos)
    lower_yellow = np.array([17, 35, 45], dtype=np.uint8)
    upper_yellow = np.array([32, 255, 255], dtype=np.uint8)
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    # 3. Segment Necrotic Brown/Black/Rust Lesions and Water-Soaked Cankers
    lower_necrotic1 = np.array([0, 30, 15], dtype=np.uint8)
    upper_necrotic1 = np.array([17, 255, 205], dtype=np.uint8)
    mask_necrotic1 = cv2.inRange(hsv, lower_necrotic1, upper_necrotic1)

    lower_necrotic2 = np.array([145, 30, 15], dtype=np.uint8)
    upper_necrotic2 = np.array([180, 255, 205], dtype=np.uint8)
    mask_necrotic2 = cv2.inRange(hsv, lower_necrotic2, upper_necrotic2)

    # Water-soaked dark/gray necrosis (e.g. Late Blight)
    mask_dark_necrosis = cv2.inRange(hsv, np.array([0, 0, 10], dtype=np.uint8), np.array([180, 255, 68], dtype=np.uint8))

    raw_necrotic_mask = cv2.bitwise_or(mask_necrotic1, mask_necrotic2)
    raw_necrotic_mask = cv2.bitwise_or(raw_necrotic_mask, mask_dark_necrosis)

    # Clean morphological filtering
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    total_leaf_mask = cv2.bitwise_or(green_mask, yellow_mask)
    total_leaf_mask = cv2.bitwise_or(total_leaf_mask, raw_necrotic_mask)
    total_leaf_mask = cv2.morphologyEx(total_leaf_mask, cv2.MORPH_CLOSE, kernel)

    foliar_pixels = int(np.count_nonzero(total_leaf_mask))
    if foliar_pixels < 500:
        foliar_pixels = h * w
        total_leaf_mask = np.ones((h, w), dtype=np.uint8) * 255

    # Isolate within leaf blade boundary
    clean_green = cv2.bitwise_and(green_mask, total_leaf_mask)
    clean_yellow = cv2.bitwise_and(yellow_mask, total_leaf_mask)
    clean_necrotic = cv2.bitwise_and(raw_necrotic_mask, total_leaf_mask)

    # Ensure mutually exclusive classification
    clean_yellow = cv2.bitwise_and(clean_yellow, cv2.bitwise_not(clean_necrotic))
    clean_green = cv2.bitwise_and(clean_green, cv2.bitwise_not(cv2.bitwise_or(clean_yellow, clean_necrotic)))

    # Boost lesions if Grad-CAM saliency is provided
    if gradcam_mask is not None:
        if gradcam_mask.shape != (h, w):
            gradcam_resized = cv2.resize(gradcam_mask, (w, h), interpolation=cv2.INTER_LINEAR)
        else:
            gradcam_resized = gradcam_mask
        saliency_active = (gradcam_resized > 0.45).astype(np.uint8) * 255
        attention_leaf = cv2.bitwise_and(saliency_active, total_leaf_mask)
        # Add non-green attention zones to necrotic or chlorotic areas
        attention_deviation = cv2.bitwise_and(attention_leaf, cv2.bitwise_not(clean_green))
        clean_necrotic = cv2.bitwise_or(clean_necrotic, attention_deviation)

    clean_necrotic = cv2.morphologyEx(clean_necrotic, cv2.MORPH_OPEN, kernel)
    clean_yellow = cv2.morphologyEx(clean_yellow, cv2.MORPH_OPEN, kernel)

    green_px = int(np.count_nonzero(clean_green))
    yellow_px = int(np.count_nonzero(clean_yellow))
    necrotic_px = int(np.count_nonzero(clean_necrotic))
    total_analyzed = max(1, green_px + yellow_px + necrotic_px)

    # 4. Foliar Discoloration Metrics
    healthy_green_pct = round((green_px / total_analyzed) * 100.0, 1)
    chlorosis_yellow_pct = round((yellow_px / total_analyzed) * 100.0, 1)
    necrosis_brown_pct = round((necrotic_px / total_analyzed) * 100.0, 1)

    # Balance to ensure strict 100% sum
    healthy_green_pct = round(max(0.0, 100.0 - chlorosis_yellow_pct - necrosis_brown_pct), 1)

    # Severity percentage: dead necrotic tissue + 50% chlorotic stress
    severity_pct = round(min(100.0, necrosis_brown_pct + (0.5 * chlorosis_yellow_pct)), 1)

    # 5. ICAR 5-Stage Classification Scale
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

    # 6. Discoloration Symptom Diagnosis
    if necrosis_brown_pct > 12.0:
        disc_type = "Severe Necrotic Blight & Foliar Collapse"
        disc_diag = "Extensive necrotic cell death detected with dark target-board or water-soaked lesions. High risk of fungal/bacterial spread."
        disc_level = "Severe"
    elif necrosis_brown_pct > 4.0 and chlorosis_yellow_pct > 10.0:
        disc_type = "Necrotic Lesions with Active Chlorotic Halos"
        disc_diag = "Active pathogen proliferation: focal necrotic spots are surrounded by yellow chlorotic margins due to toxin production."
        disc_level = "Moderate"
    elif necrosis_brown_pct > 3.0:
        disc_type = "Foliar Spotting & Localized Necrosis"
        disc_diag = "Focal leaf lesions detected. Early infection centers identified; sanitize lower canopy and improve airflow."
        disc_level = "Mild"
    elif chlorosis_yellow_pct > 15.0:
        disc_type = "Diffuse Foliar Chlorosis (Yellowing)"
        disc_diag = "Widespread loss of chlorophyll without major necrotic tissue death. Check for viral mosaic/curling or primary nutrient deficiency (N/K/Fe)."
        disc_level = "Moderate"
    elif chlorosis_yellow_pct > 6.0:
        disc_type = "Mild Chlorotic Mottling"
        disc_diag = "Early foliar yellowing mottling detected. Inspect for early sap-sucking pest activity (mites/whiteflies) or initial nutrient stress."
        disc_level = "Mild"
    else:
        disc_type = "Uniform Photosynthetic Pigment"
        disc_diag = "Normal, healthy chlorophyll distribution. Leaf blade exhibits vigorous green coloration without pathological discoloration."
        disc_level = "Trace"

    # 7. Lesion Contours & Counting
    contours, _ = cv2.findContours(clean_necrotic, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    significant_contours = [c for c in contours if cv2.contourArea(c) > 20]
    spot_count = len(significant_contours)

    # 8. Clinical Visualization Diagnostic Overlay
    overlay_b64 = None
    if generate_overlay:
        vis = image.copy()

        # A. Highlight Chlorotic (Yellow) Zones with subtle gold tint
        yellow_tint = np.zeros_like(vis)
        yellow_tint[:, :] = (234, 179, 8)  # Gold/Yellow
        yellow_alpha = (clean_yellow > 0)[:, :, np.newaxis]
        vis = np.where(yellow_alpha, cv2.addWeighted(vis, 0.70, yellow_tint, 0.30, 0), vis)

        # B. Highlight Necrotic (Red/Brown) Lesions with vivid red wash & outlines
        red_tint = np.zeros_like(vis)
        red_tint[:, :] = (239, 68, 68)  # Red
        red_alpha = (clean_necrotic > 0)[:, :, np.newaxis]
        vis = np.where(red_alpha, cv2.addWeighted(vis, 0.60, red_tint, 0.40, 0), vis)

        # Draw red contours around necrotic spots
        cv2.drawContours(vis, significant_contours, -1, (239, 68, 68), 2)

        # Number the top 8 largest lesions
        sorted_contours = sorted(significant_contours, key=cv2.contourArea, reverse=True)[:8]
        for idx, cnt in enumerate(sorted_contours):
            M = cv2.moments(cnt)
            if M["m00"] > 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                # Marker dot with number
                cv2.circle(vis, (cX, cY), 7, (255, 255, 255), -1)
                cv2.circle(vis, (cX, cY), 7, (220, 38, 38), 1)
                cv2.putText(
                    vis,
                    str(idx + 1),
                    (cX - 4, cY + 4),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.35,
                    (15, 23, 42),
                    1,
                    cv2.LINE_AA,
                )

        pil_img = Image.fromarray(vis)
        buffer = io.BytesIO()
        pil_img.save(buffer, format="JPEG", quality=88)
        overlay_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"

    return FoliarSeverityResult(
        foliar_area_pixels=foliar_pixels,
        lesion_area_pixels=necrotic_px,
        severity_percentage=severity_pct,
        severity_grade=grade,
        grade_label=label,
        projected_yield_loss_pct=loss_est,
        lesion_spot_count=spot_count,
        contour_image_base64=overlay_b64,
        healthy_green_pct=healthy_green_pct,
        chlorosis_yellow_pct=chlorosis_yellow_pct,
        necrosis_brown_pct=necrosis_brown_pct,
        discoloration_type=disc_type,
        discoloration_diagnosis=disc_diag,
        discoloration_level=disc_level,
    )
