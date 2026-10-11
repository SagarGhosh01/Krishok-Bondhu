"""
AgriShield AI - Out-of-Distribution (OOD) & Crop Compatibility Detector
Leverages energy scores and feature-space representations to flag non-leaf,
unrelated, or unsupported crop imagery before committing to a disease diagnosis.
"""

from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import torch
from sklearn.metrics import roc_auc_score


class OODDetector:
    """
    Computes energy score E(x) and feature-space distance to determine whether
    an input image belongs to the in-distribution crop leaf domain.
    """

    def __init__(self, energy_temperature: float = 1.0):
        self.energy_temperature = energy_temperature
        self.energy_threshold: float = -5.0  # Tuned during calibration
        self.class_centroids: Optional[np.ndarray] = None

    def compute_energy(self, logits: np.ndarray) -> np.ndarray:
        """
        Computes Helmholtz free energy score:
        E(x) = -T * log(sum(exp(z_i / T)))
        In-distribution samples with peaked activations have lower (more negative) energy.
        Out-of-distribution samples with diffuse activations have higher (closer to 0) energy.
        """
        scaled = logits / self.energy_temperature
        # Numerically stable LogSumExp: max + log(sum(exp(x - max)))
        max_val = np.max(scaled, axis=1, keepdims=True)
        lse = max_val + np.log(np.sum(np.exp(scaled - max_val), axis=1, keepdims=True))
        energy = -self.energy_temperature * lse.flatten()
        return energy

    def fit_threshold(
        self,
        val_in_dist_logits: np.ndarray,
        target_tpr: float = 0.95,
        penultimate_features: Optional[np.ndarray] = None,
        val_labels: Optional[np.ndarray] = None,
    ) -> float:
        """
        Calculates the energy threshold that admits target_tpr (e.g. 95%) of valid
        in-distribution leaves.
        """
        val_energies = self.compute_energy(val_in_dist_logits)
        # 95th percentile of energies (since lower energy = in-distribution)
        self.energy_threshold = float(np.percentile(val_energies, target_tpr * 100))

        if penultimate_features is not None and val_labels is not None:
            # Compute class centroids in feature space
            unique_classes = np.unique(val_labels)
            num_classes = len(unique_classes)
            feat_dim = penultimate_features.shape[1]
            centroids = np.zeros((num_classes, feat_dim), dtype=np.float32)
            for c in unique_classes:
                c_feats = penultimate_features[val_labels == c]
                centroids[c] = np.mean(c_feats, axis=0)
            self.class_centroids = centroids

        print(f"[OOD Detector] Calibrated energy threshold at {target_tpr*100:.0f}% TPR: {self.energy_threshold:.4f}")
        return self.energy_threshold

    def is_in_distribution(self, logits: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Returns boolean mask (True = In-Distribution, False = OOD) and computed energy scores.
        """
        energies = self.compute_energy(logits)
        in_dist_mask = energies <= self.energy_threshold
        return in_dist_mask, energies

    def evaluate_auroc(
        self,
        in_dist_logits: np.ndarray,
        ood_logits: np.ndarray,
    ) -> Dict[str, float]:
        """
        Calculates AUROC (Area Under Receiver Operating Characteristic Curve)
        discriminating in-distribution leaves from OOD samples.
        """
        in_energies = self.compute_energy(in_dist_logits)
        ood_energies = self.compute_energy(ood_logits)

        # Labels: 1 for in-distribution, 0 for OOD
        y_true = np.concatenate([np.ones_like(in_energies), np.zeros_like(ood_energies)])
        # Higher score should mean in-distribution, so negate energy
        y_scores = np.concatenate([-in_energies, -ood_energies])

        auroc = float(roc_auc_score(y_true, y_scores))
        return {
            "auroc": auroc,
            "mean_in_dist_energy": float(np.mean(in_energies)),
            "mean_ood_energy": float(np.mean(ood_energies)),
        }
