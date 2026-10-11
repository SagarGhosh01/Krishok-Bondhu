"""
AgriShield AI - Production Inference & Prediction Service
Encapsulates ONNX Runtime inference, Image Quality validation, OOD detection,
Grad-CAM explainability, and database persistence.
"""

import io
import json
import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image
import numpy as np
import onnxruntime as ort
import torch
from sqlalchemy.orm import Session

from services.api.core.config import settings
from services.api.database.models import Scan, Prediction, ModelVersion, Disease, DiseaseTranslation, Advisory
from services.api.schemas.predict import (
    PredictionResponse,
    QualityCheckOut,
    AlternativeCandidateOut,
    AdvisorySummaryOut,
    FoliarSeverityOut,
)
from ml.src.data.classes import CLASS_NAMES, TAXONOMY_METADATA
from ml.src.reliability.quality_gate import ImageQualityGate
from ml.src.reliability.ood_detector import OODDetector
from ml.src.reliability.decision_engine import DecisionEngine, DiagnosticState
from ml.src.reliability.severity_estimator import estimate_foliar_severity
from ml.src.models.classifier import build_model
from ml.src.explainability.gradcam import GradCAM


class PredictionService:
    _instance = None

    def __init__(self):
        self.model_dir = Path(settings.MODEL_DIR)
        self.metadata_path = self.model_dir / "metadata.json"
        self.onnx_path = self.model_dir / "model.onnx"

        # Fallback to int8 if fp32 not found
        if not self.onnx_path.exists():
            self.onnx_path = self.model_dir / "model_int8.onnx"

        # Load metadata
        self.temperature = 1.0
        self.ood_threshold = -3.3
        self.version_str = "1.0.0"

        if self.metadata_path.exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
                self.version_str = meta.get("model_version", "1.0.0")
                self.temperature = meta.get("calibration", {}).get("temperature", 1.0)
                self.ood_threshold = meta.get("reliability_thresholds", {}).get("ood_energy_threshold", -3.3)

        # Initialize ONNX session
        self.session = None
        if self.onnx_path.exists():
            self.session = ort.InferenceSession(str(self.onnx_path), providers=["CPUExecutionProvider"])
            print(f"[PredictionService] ONNX session loaded: {self.onnx_path.name}")

        # Initialize Quality Gate & OOD Detector
        self.quality_gate = ImageQualityGate(
            min_blur_score=settings.BLUR_THRESHOLD,
            min_luminance=settings.MIN_LUMINANCE,
            max_luminance=settings.MAX_LUMINANCE,
        )
        self.ood_detector = OODDetector()
        self.ood_detector.energy_threshold = self.ood_threshold

        self.decision_engine = DecisionEngine(
            quality_gate=self.quality_gate,
            ood_detector=self.ood_detector,
            temperature=self.temperature,
            confidence_threshold=settings.CONFIDENCE_THRESHOLD,
            uncertainty_floor=settings.UNCERTAINTY_FLOOR,
        )

        # Initialize PyTorch model for Grad-CAM overlay generation
        self.gradcam = None
        ckpt_path = settings.BASE_DIR / "ml" / "artifacts" / "mobilenet_v3_large_seed42" / "best_model.pt"
        if ckpt_path.exists():
            try:
                pt_model = build_model("mobilenet_v3_large", num_classes=len(CLASS_NAMES), pretrained=False)
                pt_model.load_state_dict(torch.load(ckpt_path, map_location="cpu"))
                pt_model.eval()
                # Target last conv layer in MobileNetV3
                target_layer = pt_model.features[16]
                self.gradcam = GradCAM(pt_model, target_layer)
                self.pt_model = pt_model
                print("[PredictionService] Grad-CAM engine successfully initialized.")
            except Exception as e:
                print(f"[PredictionService] Grad-CAM init error: {e}")

    @classmethod
    def get_instance(cls) -> "PredictionService":
        if cls._instance is None:
            cls._instance = PredictionService()
        return cls._instance

    def preprocess_image(self, img: Image.Image) -> np.ndarray:
        """Standard 224x224 RGB bilinear resize and ImageNet normalisation."""
        img_rgb = img.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        arr = np.array(img_rgb, dtype=np.float32) / 255.0
        # Normalization
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        norm = (arr - mean) / std
        # (H, W, C) -> (1, C, H, W)
        tensor = np.transpose(norm, (2, 0, 1))
        return np.expand_dims(tensor, axis=0).astype(np.float32)

    def predict(
        self,
        image_bytes: bytes,
        original_filename: str,
        db: Session,
        user_id: Optional[str] = None,
        farm_id: Optional[str] = None,
        selected_crop: Optional[str] = None,
        language: str = "en",
        client_uuid: Optional[str] = None,
        is_offline_captured: bool = False,
    ) -> PredictionResponse:
        # Prevent decompression bombs (> 20M pixels)
        Image.MAX_IMAGE_PIXELS = 20_000_000

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image.verify()  # Verify integrity
            image = Image.open(io.BytesIO(image_bytes))  # Re-open after verify
        except Exception as e:
            raise ValueError(f"Corrupt or invalid image format: {e}")

        w, h = image.size
        img_size_bytes = len(image_bytes)

        # 1. Image Quality Gate
        q_result = self.quality_gate.evaluate(image)

        # 2. Forward pass through ONNX model
        input_tensor = self.preprocess_image(image)
        if self.session:
            raw_logits = self.session.run(None, {"input": input_tensor})[0][0]
        else:
            # Fallback if ONNX session not yet ready
            raw_logits = np.zeros(len(CLASS_NAMES), dtype=np.float32)

        # 3. Decision Engine
        outcome = self.decision_engine.evaluate(image, raw_logits, selected_crop)

        # 4. Save Image & Grad-CAM to disk
        scan_id = str(uuid.uuid4())
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        img_ext = Path(original_filename).suffix.lower() or ".jpg"
        saved_img_name = f"scan_{scan_id}{img_ext}"
        saved_img_path = settings.UPLOAD_DIR / saved_img_name
        with open(saved_img_path, "wb") as f:
            f.write(image_bytes)

        gradcam_url = None
        gradcam_disclaimer = "Highlighted regions show where the model looked. This is a visual screening aid, not proof the prediction is correct."

        if outcome.state != DiagnosticState.CANNOT_ASSESS and self.gradcam:
            try:
                pt_tensor = torch.from_numpy(input_tensor)
                primary_idx = CLASS_NAMES.index(outcome.primary_class) if outcome.primary_class else 0
                heatmap = self.gradcam.generate_heatmap(pt_tensor, target_class_idx=primary_idx)
                cam_img, _ = self.gradcam.create_overlay(image, heatmap)
                cam_name = f"gradcam_{scan_id}.jpg"
                cam_path = settings.UPLOAD_DIR / cam_name
                cam_img.save(cam_path, "JPEG", quality=90)
                gradcam_url = f"/uploads/{cam_name}"
            except Exception as e:
                print(f"[Grad-CAM Error] {e}")

        # 4b. Quantitative Foliar Severity & ICAR 5-Stage Scale
        foliar_severity = None
        if outcome.state != DiagnosticState.CANNOT_ASSESS:
            try:
                np_img_rgb = np.array(image.convert("RGB"), dtype=np.uint8)
                if outcome.is_healthy:
                    foliar_severity = FoliarSeverityOut(
                        severity_percentage=0.0,
                        severity_grade=1,
                        grade_label="Healthy Foliage",
                        projected_yield_loss_pct="0% (Optimal Growth)",
                        lesion_spot_count=0,
                        contour_image_base64=None,
                    )
                else:
                    sev_mask = heatmap if "heatmap" in locals() and heatmap is not None else None
                    sev_res = estimate_foliar_severity(np_img_rgb, gradcam_mask=sev_mask)
                    foliar_severity = FoliarSeverityOut(
                        severity_percentage=sev_res.severity_percentage,
                        severity_grade=sev_res.severity_grade,
                        grade_label=sev_res.grade_label,
                        projected_yield_loss_pct=sev_res.projected_yield_loss_pct,
                        lesion_spot_count=sev_res.lesion_spot_count,
                        contour_image_base64=sev_res.contour_image_base64,
                    )
            except Exception as e:
                print(f"[Foliar Severity Error] {e}")

        # 5. Retrieve Curated Advisory
        advisory_summary = None
        scientific_name = None
        if outcome.primary_class:
            meta = TAXONOMY_METADATA.get(outcome.primary_class, {})
            scientific_name = meta.get("scientific_name")

            disease = db.query(Disease).filter(Disease.class_key == outcome.primary_class).first()
            if disease:
                trans = db.query(DiseaseTranslation).filter(
                    DiseaseTranslation.disease_id == disease.id,
                    DiseaseTranslation.language == language,
                ).first()
                adv = db.query(Advisory).filter(
                    Advisory.disease_id == disease.id,
                    Advisory.language == language,
                ).first()

                if trans and adv:
                    advisory_summary = AdvisorySummaryOut(
                        language=language,
                        display_name=trans.display_name,
                        description=trans.description,
                        symptoms=trans.symptoms,
                        cultural_practices=adv.cultural_practices,
                        biological_control=adv.biological_control,
                        chemical_reference=adv.chemical_reference,
                        source_title=adv.source_title,
                        source_url=adv.source_url,
                        reviewer_name=adv.reviewer_name,
                        review_date=adv.review_date.isoformat() if adv.review_date else None,
                    )

        # 6. Database Persistence
        model_ver_record = db.query(ModelVersion).filter(ModelVersion.version_str == self.version_str).first()
        model_version_id = model_ver_record.id if model_ver_record else None

        scan_record = Scan(
            id=scan_id,
            client_uuid=client_uuid,
            user_id=user_id,
            farm_id=farm_id,
            image_path=f"/uploads/{saved_img_name}",
            original_filename=original_filename,
            image_size_bytes=img_size_bytes,
            width=w,
            height=h,
            blur_score=q_result.blur_score,
            luminance=q_result.luminance,
            is_offline_captured=is_offline_captured,
        )
        db.add(scan_record)

        top_alts_dicts = [
            {
                "class_idx": a.class_idx,
                "class_name": a.class_name,
                "crop": a.crop,
                "disease_name": a.disease_name,
                "probability": a.probability,
            }
            for a in outcome.top_alternatives
        ]

        pred_record = Prediction(
            scan_id=scan_id,
            model_version_id=model_version_id,
            predicted_class=outcome.primary_class,
            crop=outcome.primary_crop,
            confidence=float(np.max(np.exp(raw_logits) / np.sum(np.exp(raw_logits)))),
            calibrated_confidence=outcome.calibrated_confidence,
            reliability_score=outcome.reliability_score,
            diagnostic_state=outcome.state.value,
            top_alternatives_json=json.dumps(top_alts_dicts),
            gradcam_path=gradcam_url,
        )
        db.add(pred_record)
        db.commit()

        return PredictionResponse(
            scan_id=scan_id,
            state=outcome.state.value,
            primary_class=outcome.primary_class,
            primary_crop=outcome.primary_crop,
            primary_disease=outcome.primary_disease,
            scientific_name=scientific_name,
            is_healthy=outcome.is_healthy,
            calibrated_confidence=outcome.calibrated_confidence,
            reliability_score=outcome.reliability_score,
            energy_score=outcome.energy_score,
            quality=QualityCheckOut(
                passed=q_result.passed,
                blur_score=q_result.blur_score,
                luminance=q_result.luminance,
                width=q_result.width,
                height=q_result.height,
                defect=q_result.defect,
                message=q_result.message,
            ),
            top_alternatives=[
                AlternativeCandidateOut(
                    class_idx=a.class_idx,
                    class_name=a.class_name,
                    crop=a.crop,
                    disease_name=a.disease_name,
                    probability=a.probability,
                )
                for a in outcome.top_alternatives
            ],
            advisory=advisory_summary,
            severity=foliar_severity,
            gradcam_url=gradcam_url,
            gradcam_disclaimer=gradcam_disclaimer,
            message=outcome.message,
            action_guidance=outcome.action_guidance,
            requires_expert_consultation=outcome.requires_expert_consultation,
            model_version=self.version_str,
        )
