"""
AgriShield AI - Post-Hoc Temperature Scaling Calibration
Calibrates model output logits on the held-out validation set to align predicted
softmax confidences with empirical ground-truth likelihoods, reducing overconfidence.
"""

from typing import Dict, Tuple, Any
import numpy as np
import torch
import torch.nn as nn
from torch.optim import LBFGS

from ml.src.training.metrics import compute_expected_calibration_error


class TemperatureScaler(nn.Module):
    """
    Applies learned scalar temperature parameter T to logits:
    p_calibrated = softmax(logits / T)
    """

    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        return logits / self.temperature

    def fit(
        self,
        val_logits: torch.Tensor,
        val_labels: torch.Tensor,
        max_iter: int = 50,
        lr: float = 0.01,
    ) -> Dict[str, Any]:
        """
        Tunes scalar temperature on validation set using L-BFGS to minimize NLL.
        """
        val_logits = val_logits.detach()
        val_labels = val_labels.detach()
        nll_criterion = nn.CrossEntropyLoss()

        # Compute raw uncalibrated ECE and NLL
        raw_probs = torch.softmax(val_logits, dim=1).numpy()
        raw_ece, _ = compute_expected_calibration_error(val_labels.numpy(), raw_probs)
        raw_nll = float(nll_criterion(val_logits, val_labels).item())

        optimizer = LBFGS([self.temperature], lr=lr, max_iter=max_iter)

        def eval_loss():
            optimizer.zero_grad()
            loss = nll_criterion(self.forward(val_logits), val_labels)
            loss.backward()
            return loss

        optimizer.step(eval_loss)

        # Enforce positive temperature
        with torch.no_grad():
            self.temperature.clamp_(min=0.1, max=10.0)

        # Compute calibrated metrics
        cal_logits = self.forward(val_logits).detach()
        cal_probs = torch.softmax(cal_logits, dim=1).numpy()
        cal_ece, _ = compute_expected_calibration_error(val_labels.numpy(), cal_probs)
        cal_nll = float(nll_criterion(cal_logits, val_labels).item())

        optimal_temp = float(self.temperature.item())

        print(f"[Calibration] Temperature fitted: {optimal_temp:.4f}")
        print(f"[Calibration] NLL: {raw_nll:.4f} -> {cal_nll:.4f} | ECE: {raw_ece:.4f} ({raw_ece*100:.2f}%) -> {cal_ece:.4f} ({cal_ece*100:.2f}%)")

        return {
            "optimal_temperature": optimal_temp,
            "raw_nll": raw_nll,
            "calibrated_nll": cal_nll,
            "raw_ece": raw_ece,
            "calibrated_ece": cal_ece,
            "improvement_pct": float((raw_ece - cal_ece) / max(1e-5, raw_ece) * 100.0),
        }
