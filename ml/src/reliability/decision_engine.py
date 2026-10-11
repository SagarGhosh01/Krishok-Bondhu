"""
AgriShield AI - Diagnostic Decision Engine & Abstention Framework
Combines Optical Quality Gating, OOD Energy Filtering, Crop Compatibility Validation,
and Calibrated Probabilities to produce one of three certified diagnostic states:
1. CONFIDENT (Screening Result)
2. UNCERTAIN (Top-3 Differential Alternatives)
3. CANNOT_ASSESS (Defect / Unsupported Rejection)
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from PIL import Image
import numpy as np

from ml.src.data.classes import CLASS_NAMES, TAXONOMY_METADATA
from ml.src.reliability.quality_gate import ImageQualityGate, QualityCheckResult
from ml.src.reliability.ood_detector import OODDetector


class DiagnosticState(str, Enum):
    CONFIDENT = "CONFIDENT"
    UNCERTAIN = "UNCERTAIN"
    CANNOT_ASSESS = "CANNOT_ASSESS"


@dataclass
class AlternativeCandidate:
    class_idx: int
    class_name: str
    crop: str
    disease_name: str
    probability: float


@dataclass
class DiagnosticOutcome:
    state: DiagnosticState
    primary_class: Optional[str]
    primary_crop: Optional[str]
    primary_disease: Optional[str]
    calibrated_confidence: float
    reliability_score: float
    is_healthy: bool
    top_alternatives: List[AlternativeCandidate]
    quality_result: QualityCheckResult
    energy_score: float
    message: str
    action_guidance: str
    requires_expert_consultation: bool


class DecisionEngine:
    """
    Evaluates raw images, raw model logits, and user metadata to emit trustworthy,
    governed diagnostic outcomes without synthetic assertions.
    """

    def __init__(
        self,
        quality_gate: ImageQualityGate,
        ood_detector: OODDetector,
        temperature: float = 1.0,
        confidence_threshold: float = 0.65,
        uncertainty_floor: float = 0.25,
    ):
        self.quality_gate = quality_gate
        self.ood_detector = ood_detector
        self.temperature = max(0.1, temperature)
        self.confidence_threshold = confidence_threshold
        self.uncertainty_floor = uncertainty_floor

    def evaluate(
        self,
        image: Image.Image,
        raw_logits: np.ndarray,
        selected_crop: Optional[str] = None,
    ) -> DiagnosticOutcome:
        """
        Runs the full 4-stage reliability pipeline:
        1. Optical quality validation
        2. OOD Energy testing on raw logits
        3. Crop compatibility checking
        4. Calibrated confidence stratification
        """
        # Stage 1: Quality Check
        q_result = self.quality_gate.evaluate(image)
        if not q_result.passed:
            return DiagnosticOutcome(
                state=DiagnosticState.CANNOT_ASSESS,
                primary_class=None,
                primary_crop=None,
                primary_disease=None,
                calibrated_confidence=0.0,
                reliability_score=0.0,
                is_healthy=False,
                top_alternatives=[],
                quality_result=q_result,
                energy_score=0.0,
                message=f"Image rejected: {q_result.message}",
                action_guidance="Please retake the photo following pre-capture guidelines: ensure steady focus, adequate daylight, and center a single leaf on a plain background.",
                requires_expert_consultation=False,
            )

        # Stage 2: OOD Energy Check on raw logits
        in_dist_mask, energies = self.ood_detector.is_in_distribution(raw_logits.reshape(1, -1))
        energy_val = float(energies[0])
        if not in_dist_mask[0]:
            return DiagnosticOutcome(
                state=DiagnosticState.CANNOT_ASSESS,
                primary_class=None,
                primary_crop=None,
                primary_disease=None,
                calibrated_confidence=0.0,
                reliability_score=0.1,
                is_healthy=False,
                top_alternatives=[],
                quality_result=q_result,
                energy_score=energy_val,
                message="Image appears out-of-distribution or contains an unsupported object/crop.",
                action_guidance="AgriShield AI currently supports Tomato, Potato, and Corn leaves. Please ensure you are photographing a supported crop leaf.",
                requires_expert_consultation=True,
            )

        # Stage 3: Calibrated Probability Distribution
        scaled_logits = raw_logits / self.temperature
        probs = np.exp(scaled_logits - np.max(scaled_logits))
        probs = probs / np.sum(probs)
        top_indices = np.argsort(probs)[::-1]

        primary_idx = int(top_indices[0])
        primary_class = CLASS_NAMES[primary_idx]
        primary_conf = float(probs[primary_idx])
        meta = TAXONOMY_METADATA[primary_class]

        # Top-3 candidates
        top_alternatives = []
        for rank_idx in top_indices[:3]:
            c_name = CLASS_NAMES[rank_idx]
            c_meta = TAXONOMY_METADATA[c_name]
            top_alternatives.append(AlternativeCandidate(
                class_idx=int(rank_idx),
                class_name=c_name,
                crop=c_meta["crop"],
                disease_name=c_meta["disease_name"],
                probability=float(probs[rank_idx]),
            ))

        # Crop Compatibility Check
        crop_mismatch = selected_crop and (selected_crop.lower() != meta["crop"].lower())

        # Reliability score synthesis
        norm_blur = min(1.0, q_result.blur_score / 300.0)
        reliability = float(np.clip(primary_conf * 0.7 + norm_blur * 0.3, 0.05, 0.99))

        # Stage 4: Decision State Stratification
        if crop_mismatch:
            return DiagnosticOutcome(
                state=DiagnosticState.UNCERTAIN,
                primary_class=primary_class,
                primary_crop=meta["crop"],
                primary_disease=meta["disease_name"],
                calibrated_confidence=primary_conf,
                reliability_score=reliability * 0.5,
                is_healthy=meta["is_healthy"],
                top_alternatives=top_alternatives,
                quality_result=q_result,
                energy_score=energy_val,
                message=f"Possible crop mismatch: You selected {selected_crop}, but image resembles {meta['crop']} ({meta['disease_name']}).",
                action_guidance="Verify the selected crop or consult an agricultural extension officer to confirm identity.",
                requires_expert_consultation=True,
            )

        if primary_conf >= self.confidence_threshold:
            return DiagnosticOutcome(
                state=DiagnosticState.CONFIDENT,
                primary_class=primary_class,
                primary_crop=meta["crop"],
                primary_disease=meta["disease_name"],
                calibrated_confidence=primary_conf,
                reliability_score=reliability,
                is_healthy=meta["is_healthy"],
                top_alternatives=top_alternatives,
                quality_result=q_result,
                energy_score=energy_val,
                message=f"Screening identified characteristics of {meta['disease_name']} on {meta['crop']}.",
                action_guidance="Review prevention guidelines below. For chemical control, always follow locally approved guidance.",
                requires_expert_consultation=False,
            )
        elif primary_conf >= self.uncertainty_floor:
            return DiagnosticOutcome(
                state=DiagnosticState.UNCERTAIN,
                primary_class=primary_class,
                primary_crop=meta["crop"],
                primary_disease=meta["disease_name"],
                calibrated_confidence=primary_conf,
                reliability_score=reliability * 0.7,
                is_healthy=meta["is_healthy"],
                top_alternatives=top_alternatives,
                quality_result=q_result,
                energy_score=energy_val,
                message=f"Ambiguous symptoms detected. Primary hypothesis is {meta['disease_name']}, but differential candidates are close.",
                action_guidance="Symptoms are inconclusive. Inspect the top differential candidates below and consult a local agricultural extension officer.",
                requires_expert_consultation=True,
            )
        else:
            return DiagnosticOutcome(
                state=DiagnosticState.CANNOT_ASSESS,
                primary_class=primary_class,
                primary_crop=meta["crop"],
                primary_disease=meta["disease_name"],
                calibrated_confidence=primary_conf,
                reliability_score=reliability * 0.3,
                is_healthy=meta["is_healthy"],
                top_alternatives=top_alternatives,
                quality_result=q_result,
                energy_score=energy_val,
                message="Confidence too low to provide a responsible screening diagnosis.",
                action_guidance="Please capture another image showing clear, well-lit disease symptoms on the upper leaf surface.",
                requires_expert_consultation=True,
            )
