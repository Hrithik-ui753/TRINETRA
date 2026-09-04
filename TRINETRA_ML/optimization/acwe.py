"""
TRINETRA ML - Adaptive Confidence Windowing Experiment (ACWE)
Tests lightweight temporal confirmation rules (N-of-M consecutive windows above threshold)
on the VALIDATION set to reduce spurious transient false activations.
"""

import os
import sys
import csv
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np

os.environ["KERAS_BACKEND"] = "torch"
import keras

script_dir = Path(__file__).resolve().parent
base_ml_dir = script_dir.parent
sys.path.insert(0, str(base_ml_dir))

from features.mfcc import MFCCExtractor, fix_audio_length
from features.feature_config import DEFAULT_FEATURE_CONFIG

def evaluate_acwe_configurations(
    model: keras.Model,
    val_records: List[Dict[str, Any]],
    threshold: float = 0.50,
    extractor: MFCCExtractor = None,
    standardizer = None,
    output_csv: str = "TRINETRA_ML/reports/optimization/acwe_results.csv"
) -> List[Dict[str, Any]]:
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    if extractor is None:
        extractor = MFCCExtractor(DEFAULT_FEATURE_CONFIG)

    configs = [
        {"name": "1 of 1 (Standard Single-Window)", "N": 1, "M": 1, "delay_windows": 0},
        {"name": "1 of 2 (Transient Leniency)",       "N": 1, "M": 2, "delay_windows": 0},
        {"name": "2 of 2 (Strict Dual-Window)",       "N": 2, "M": 2, "delay_windows": 1},
        {"name": "2 of 3 (Balanced Confirmation)",    "N": 2, "M": 3, "delay_windows": 1},
        {"name": "2 of 4 (Robust Temporal Confirm)",  "N": 2, "M": 4, "delay_windows": 1},
        {"name": "3 of 4 (Ultra-High Rejection)",     "N": 3, "M": 4, "delay_windows": 2}
    ]

    # Pre-extract multi-window predictions for each validation clip
    # For a clip, generate 4 overlapping sub-windows
    clip_predictions = []
    total_positives = sum(1 for r in val_records if r["label"] == "positive")

    for r in val_records:
        import soundfile as sf
        audio, sr = sf.read(r["full_path"], dtype='float32')
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        target_len = 16000
        hop_shift = 800  # 50ms temporal shift
        
        pad_len = max(target_len, len(audio)) + 2 * hop_shift
        padded = np.zeros(pad_len, dtype=np.float32)
        start_idx = (pad_len - len(audio)) // 2
        padded[start_idx : start_idx + len(audio)] = audio

        window_probs = []
        center_start = (pad_len - target_len) // 2
        for offset_k in range(-2, 2):
            w_start = center_start + offset_k * hop_shift
            w_audio = padded[w_start : w_start + target_len]
            mfcc = extractor.extract_from_audio(w_audio)
            if standardizer is not None:
                mfcc_norm = standardizer.transform(np.expand_dims(mfcc, axis=0))
                mfcc_in = np.expand_dims(mfcc_norm, axis=-1)
            else:
                mfcc_in = np.expand_dims(np.expand_dims(mfcc, axis=0), axis=-1)
            probs = model.predict(mfcc_in, verbose=0)[0]
            window_probs.append(float(probs[2]))  # P(TRINETRA)

        clip_predictions.append({
            "id": r["id"],
            "label": r["label"],
            "probs": window_probs  # list of 4 float probabilities
        })

    results = []

    for cfg in configs:
        n_req = cfg["N"]
        m_win = cfg["M"]

        tp = 0
        fn = 0
        sim_fa = 0
        neg_fa = 0
        bg_fa = 0

        for item in clip_predictions:
            p_list = item["probs"][:m_win]
            # Check if at least N out of M windows exceed threshold
            hits = sum(1 for p in p_list if p >= threshold)
            triggered = (hits >= n_req)

            lbl = item["label"]
            if lbl == "positive":
                if triggered:
                    tp += 1
                else:
                    fn += 1
            else:
                if triggered:
                    if lbl == "similar":
                        sim_fa += 1
                    elif lbl == "negative":
                        neg_fa += 1
                    elif lbl == "background":
                        bg_fa += 1

        rec = (tp / total_positives) if total_positives > 0 else 0.0
        frr = (fn / total_positives) if total_positives > 0 else 0.0
        total_fa = sim_fa + neg_fa + bg_fa

        results.append({
            "acwe_configuration": cfg["name"],
            "n_required": n_req,
            "m_window_size": m_win,
            "detection_delay_windows": cfg["delay_windows"],
            "trinetra_tp": tp,
            "trinetra_fn": fn,
            "trinetra_recall": round(rec, 4),
            "trinetra_frr": round(frr, 4),
            "similar_false_accepts": sim_fa,
            "negative_false_accepts": neg_fa,
            "background_false_accepts": bg_fa,
            "total_false_accepts": total_fa
        })

    # Save to CSV
    fieldnames = [
        "acwe_configuration", "n_required", "m_window_size", "detection_delay_windows",
        "trinetra_tp", "trinetra_fn", "trinetra_recall", "trinetra_frr",
        "similar_false_accepts", "negative_false_accepts", "background_false_accepts", "total_false_accepts"
    ]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"[ACWE] Temporal confirmation results saved -> {output_csv}")
    return results
