"""
AgriShield AI - Evaluation Metrics & Calibration Computation
Computes Top-1, Top-3 Accuracy, Macro-F1, per-class Precision/Recall/F1,
Confusion Matrix, and Expected Calibration Error (ECE).
"""

from typing import Dict, List, Tuple, Any
import numpy as np
import torch
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

from ml.src.data.classes import CLASS_NAMES


def compute_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes Top-1 classification accuracy."""
    return float(np.mean(y_true == y_pred))


def compute_top_k_accuracy(y_true: np.ndarray, y_probs: np.ndarray, k: int = 3) -> float:
    """Computes Top-k accuracy given probability/logit distribution."""
    top_k_preds = np.argsort(y_probs, axis=1)[:, -k:]
    correct = [y_true[i] in top_k_preds[i] for i in range(len(y_true))]
    return float(np.mean(correct))


def compute_expected_calibration_error(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    n_bins: int = 15,
) -> Tuple[float, Dict[str, Any]]:
    """
    Computes Expected Calibration Error (ECE):
    ECE = sum_m ( |B_m| / N ) * | acc(B_m) - conf(B_m) |
    Returns scalar ECE value (0.0 to 1.0) and detailed bin statistics.
    """
    confidences = np.max(y_probs, axis=1)
    predictions = np.argmax(y_probs, axis=1)
    accuracies = (predictions == y_true).astype(float)

    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_lowers = bin_boundaries[:-1]
    bin_uppers = bin_boundaries[1:]

    ece = 0.0
    bin_details = []

    for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            accuracy_in_bin = np.mean(accuracies[in_bin])
            avg_confidence_in_bin = np.mean(confidences[in_bin])
            abs_diff = np.abs(avg_confidence_in_bin - accuracy_in_bin)
            ece += abs_diff * prop_in_bin

            bin_details.append({
                "bin_range": [float(bin_lower), float(bin_upper)],
                "count": int(np.sum(in_bin)),
                "accuracy": float(accuracy_in_bin),
                "confidence": float(avg_confidence_in_bin),
            })

    return float(ece), {"bins": bin_details, "n_bins": n_bins}


def evaluate_predictions(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    class_names: List[str] = CLASS_NAMES,
) -> Dict[str, Any]:
    """
    Comprehensive evaluation returning Top-1, Top-3, Macro-F1, per-class breakdown,
    confusion matrix, and ECE.
    """
    y_pred = np.argmax(y_probs, axis=1)

    top1 = compute_accuracy(y_true, y_pred)
    top3 = compute_top_k_accuracy(y_true, y_probs, k=min(3, y_probs.shape[1]))
    ece, cal_details = compute_expected_calibration_error(y_true, y_probs)

    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(len(class_names))), zero_division=0
    )

    macro_precision = float(np.mean(precision))
    macro_recall = float(np.mean(recall))
    macro_f1 = float(np.mean(f1))

    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(class_names))))

    per_class_metrics = {}
    for idx, c_name in enumerate(class_names):
        per_class_metrics[c_name] = {
            "precision": float(precision[idx]),
            "recall": float(recall[idx]),
            "f1": float(f1[idx]),
            "support": int(support[idx]),
        }

    return {
        "top1_accuracy": top1,
        "top3_accuracy": top3,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "macro_f1": macro_f1,
        "expected_calibration_error": ece,
        "confusion_matrix": cm.tolist(),
        "per_class": per_class_metrics,
        "calibration_bins": cal_details,
    }
