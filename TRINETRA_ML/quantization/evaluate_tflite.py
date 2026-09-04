"""TRINETRA ML - TFLite Inference & Benchmark Evaluator.

Evaluates Float32 and INT8 quantized TFLite models on Validation and frozen Test sets
with exact model quantization/dequantization scaling parameters.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, f1_score, precision_score, recall_score

try:
    from ai_edge_litert.interpreter import Interpreter
except ImportError:
    import tensorflow as tf
    Interpreter = tf.lite.Interpreter


class TFLiteEvaluator:
    """Evaluates TFLite models (Float32 and INT8) with exact scaling parameters."""

    def __init__(self, model_path: str | Path):
        self.model_path = Path(model_path)
        self.interpreter = Interpreter(model_path=str(self.model_path))
        self.interpreter.allocate_tensors()

        self.input_details = self.interpreter.get_input_details()[0]
        self.output_details = self.interpreter.get_output_details()[0]

        self.input_dtype = self.input_details["dtype"]
        self.output_dtype = self.output_details["dtype"]

        self.input_scale, self.input_zero_point = self.input_details["quantization"]
        self.output_scale, self.output_zero_point = self.output_details["quantization"]

        self.is_int8 = np.issubdtype(self.input_dtype, np.integer)

    def predict_single(self, feature_sample: np.ndarray) -> np.ndarray:
        """Run inference on a single (97, 13) or (97, 13, 1) MFCC feature tensor."""
        if feature_sample.ndim == 2:
            input_tensor = feature_sample.reshape((1, 97, 13, 1))
        elif feature_sample.ndim == 3:
            input_tensor = np.expand_dims(feature_sample, axis=0)
        else:
            input_tensor = feature_sample.copy()

        if self.is_int8:
            # Exact Quantization: q = round(x / scale) + zero_point
            if self.input_scale > 0:
                quantized = np.round(input_tensor / self.input_scale) + self.input_zero_point
                input_data = np.clip(quantized, -128, 127).astype(np.int8)
            else:
                input_data = input_tensor.astype(np.int8)
        else:
            input_data = input_tensor.astype(np.float32)

        self.interpreter.set_tensor(self.input_details["index"], input_data)
        self.interpreter.invoke()
        output_data = self.interpreter.get_tensor(self.output_details["index"])

        if self.is_int8 and self.output_scale > 0:
            # Exact Dequantization: p = (q - zero_point) * scale
            probabilities = (output_data.astype(np.float32) - self.output_zero_point) * self.output_scale
            # Normalize probabilities if sum > 0
            row_sums = probabilities.sum(axis=-1, keepdims=True)
            row_sums[row_sums == 0] = 1.0
            probabilities = probabilities / row_sums
        else:
            probabilities = output_data.astype(np.float32)

        return probabilities[0]

    def predict_batch(self, features: np.ndarray) -> np.ndarray:
        """Run batch inference sample-by-sample."""
        probs = []
        for i in range(len(features)):
            probs.append(self.predict_single(features[i]))
        return np.array(probs)

    def evaluate_split(
        self,
        features: np.ndarray,
        labels: np.ndarray,
        df_meta: pd.DataFrame,
        threshold: float = 0.85,
    ) -> Dict[str, Any]:
        """Compute full wake-word evaluation metrics at a specified confidence threshold."""
        probs = self.predict_batch(features)
        trinetra_probs = probs[:, 2]

        # Classification decision based on confidence threshold for TRINETRA (class 2)
        argmax_preds = np.argmax(probs, axis=1)
        preds = argmax_preds.copy()

        for i in range(len(preds)):
            if trinetra_probs[i] >= threshold:
                preds[i] = 2
            elif argmax_preds[i] == 2:
                # If argmax is TRINETRA but below threshold, reassign to next best class
                preds[i] = 1 if probs[i, 1] >= probs[i, 0] else 0

        acc = float(accuracy_score(labels, preds))
        macro_f1 = float(f1_score(labels, preds, average="macro", zero_division=0))
        prec = float(precision_score(labels == 2, preds == 2, zero_division=0))
        rec = float(recall_score(labels == 2, preds == 2, zero_division=0))
        frr = 1.0 - rec

        # Detailed Category Error Breakdown
        # 1. Natural vs Synthetic TRINETRA
        pos_mask = (df_meta["ml_class"] == "TRINETRA") | (df_meta["ml_class"] == 2)
        natural_pos_mask = pos_mask & (df_meta["source"] == "natural")
        synthetic_pos_mask = pos_mask & (df_meta["source"] == "synthetic")

        natural_total = int(natural_pos_mask.sum())
        natural_correct = int((preds[natural_pos_mask] == 2).sum()) if natural_total > 0 else 0
        natural_acc = (natural_correct / natural_total) if natural_total > 0 else 0.0

        synth_total = int(synthetic_pos_mask.sum())
        synth_correct = int((preds[synthetic_pos_mask] == 2).sum()) if synth_total > 0 else 0
        synth_acc = (synth_correct / synth_total) if synth_total > 0 else 0.0

        # 2. False Activations
        similar_mask = ((df_meta["ml_class"] == "UNKNOWN") | (df_meta["ml_class"] == 1)) & (df_meta["label"] == "similar")
        negative_mask = ((df_meta["ml_class"] == "UNKNOWN") | (df_meta["ml_class"] == 1)) & (df_meta["label"] == "negative")
        background_mask = (df_meta["ml_class"] == "BACKGROUND") | (df_meta["ml_class"] == 0)

        similar_total = int(similar_mask.sum())
        similar_fa = int((preds[similar_mask] == 2).sum())

        negative_total = int(negative_mask.sum())
        negative_fa = int((preds[negative_mask] == 2).sum())

        background_total = int(background_mask.sum())
        background_fa = int((preds[background_mask] == 2).sum())

        unknown_fa = similar_fa + negative_fa
        unknown_total = similar_total + negative_total

        return {
            "model_path": str(self.model_path),
            "is_int8": self.is_int8,
            "threshold": threshold,
            "total_samples": len(labels),
            "accuracy": acc,
            "macro_f1": macro_f1,
            "trinetra_precision": prec,
            "trinetra_recall": rec,
            "trinetra_frr": frr,
            "natural_trinetra_correct": natural_correct,
            "natural_trinetra_total": natural_total,
            "natural_trinetra_pct": natural_acc * 100.0,
            "synthetic_trinetra_correct": synth_correct,
            "synthetic_trinetra_total": synth_total,
            "synthetic_trinetra_pct": synth_acc * 100.0,
            "similar_false_accepts": similar_fa,
            "similar_total": similar_total,
            "negative_false_accepts": negative_fa,
            "negative_total": negative_total,
            "unknown_false_accepts": unknown_fa,
            "unknown_total": unknown_total,
            "background_false_accepts": background_fa,
            "background_total": background_total,
            "probabilities": probs,
        }
