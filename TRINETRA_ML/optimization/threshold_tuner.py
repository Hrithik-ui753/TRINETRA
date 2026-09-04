"""
TRINETRA ML - Validation Threshold Calibrator
Sweeps confidence thresholds (0.30 to 0.90) strictly on the VALIDATION SET
to optimize natural wake-word detection vs hard-negative false wake-ups.
"""

import os
import sys
import csv
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

os.environ["KERAS_BACKEND"] = "torch"
import keras

def evaluate_threshold_sweep(
    model: keras.Model,
    X_val: np.ndarray,
    y_val: np.ndarray,
    val_labels: np.ndarray,
    thresholds: List[float] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if thresholds is None:
        thresholds = [round(t, 2) for t in np.arange(0.30, 0.95, 0.05)]

    # Get predicted probabilities: shape (N, 3)
    val_probs = model.predict(X_val, verbose=0)
    p_trinetra = val_probs[:, 2]  # Class 2 = TRINETRA probability

    total_positives = int(np.sum(y_val == 2))
    results = []

    best_score = -1.0
    selected_threshold = 0.50
    selected_record = {}

    for th in thresholds:
        # Decision rule:
        # If P(TRINETRA) >= th -> predict TRINETRA (2)
        # Else -> predict argmax among {0, 1}
        preds = np.zeros(len(y_val), dtype=int)
        for i in range(len(y_val)):
            if p_trinetra[i] >= th:
                preds[i] = 2
            else:
                preds[i] = int(np.argmax(val_probs[i, :2]))

        # Wake-word metrics
        tp = int(np.sum((y_val == 2) & (preds == 2)))
        fn = int(np.sum((y_val == 2) & (preds != 2)))
        recall = (tp / total_positives) if total_positives > 0 else 0.0
        frr = (fn / total_positives) if total_positives > 0 else 0.0

        # False accepts to TRINETRA
        unk_fa = int(np.sum((y_val == 1) & (preds == 2)))
        bg_fa = int(np.sum((y_val == 0) & (preds == 2)))
        
        sim_fa = int(np.sum((val_labels == "similar") & (preds == 2)))
        neg_fa = int(np.sum((val_labels == "negative") & (preds == 2)))
        bg_label_fa = int(np.sum((val_labels == "background") & (preds == 2)))
        total_fa = unk_fa + bg_fa

        accuracy = float(np.mean(preds == y_val))

        # Composite optimization score:
        # Balances high TRINETRA recall with penalty for false wake-up events
        # Score = Recall - 0.025 * (sim_fa + bg_fa)
        optimization_score = recall - (0.025 * sim_fa + 0.020 * bg_fa)

        rec = {
            "threshold": th,
            "tp": tp,
            "fn": fn,
            "recall": round(recall, 4),
            "frr": round(frr, 4),
            "accuracy": round(accuracy, 4),
            "unknown_fa": unk_fa,
            "background_fa": bg_fa,
            "similar_fa": sim_fa,
            "negative_fa": neg_fa,
            "total_false_accepts": total_fa,
            "optimization_score": round(optimization_score, 4)
        }
        results.append(rec)

        if optimization_score > best_score:
            best_score = optimization_score
            selected_threshold = th
            selected_record = rec

    return results, selected_record

def calibrate_and_plot_thresholds(
    model_path: str,
    features_dir: str = "TRINETRA_ML/features_data",
    output_dir: str = "TRINETRA_ML/reports/optimization"
) -> Dict[str, Any]:
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    f_path = Path(features_dir)

    model = keras.models.load_model(model_path)
    val_data = np.load(f_path / "validation_features.npz")
    X_val = np.expand_dims(val_data["X"], axis=-1)
    y_val = val_data["y"]
    val_labels = val_data["labels"]

    thresholds = [round(t, 2) for t in np.arange(0.30, 0.95, 0.05)]
    results, selected = evaluate_threshold_sweep(model, X_val, y_val, val_labels, thresholds)

    # 1. Export CSV
    csv_path = out_path / "threshold_results.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["threshold", "tp", "fn", "recall", "frr", "accuracy", "unknown_fa", "background_fa", "similar_fa", "negative_fa", "total_false_accepts", "optimization_score"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    # 2. Export Selected Threshold JSON
    json_path = out_path / "selected_threshold.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(selected, f, indent=2)

    # 3. Generate Threshold Curve Plot (Matplotlib)
    plt.style.use('default')
    fig, ax1 = plt.subplots(figsize=(9, 5.5))

    th_vals = [r["threshold"] for r in results]
    rec_vals = [r["recall"] * 100 for r in results]
    frr_vals = [r["frr"] * 100 for r in results]
    sim_fa_vals = [r["similar_fa"] for r in results]
    bg_fa_vals = [r["background_fa"] for r in results]

    ax1.plot(th_vals, rec_vals, 'g-o', label="TRINETRA Recall (%)", linewidth=2.5, markersize=5)
    ax1.plot(th_vals, frr_vals, 'r--s', label="False Rejection Rate FRR (%)", linewidth=2, markersize=5)
    ax1.set_xlabel("TRINETRA Confidence Threshold ($\theta$)", fontsize=11, fontweight='bold')
    ax1.set_ylabel("Rate (%)", fontsize=11, color='black')
    ax1.set_ylim(-2, 105)
    ax1.grid(True, alpha=0.3)

    ax2 = ax1.twinx()
    ax2.plot(th_vals, sim_fa_vals, 'm-^', label="Similar-Sound False Accepts", linewidth=2, markersize=6)
    ax2.plot(th_vals, bg_fa_vals, 'c-d', label="Background False Accepts", linewidth=2, markersize=6)
    ax2.set_ylabel("False Acceptance Count (Events)", fontsize=11, color='#8e44ad')
    ax2.set_ylim(-0.5, max(max(sim_fa_vals), max(bg_fa_vals), 5) + 2)

    # Mark selected threshold
    opt_th = selected["threshold"]
    ax1.axvline(opt_th, color='#e74c3c', linestyle=':', linewidth=2, label=f'Optimal $\\theta$ = {opt_th:.2f}')

    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="center right", fontsize=9)

    plt.title("TRINETRA Validation Threshold Calibration & Operating Curve", fontsize=13, fontweight='bold')
    plt.tight_layout()
    curve_plot = out_path / "threshold_curve.png"
    plt.savefig(curve_plot, dpi=200)
    plt.close()

    print(f"[THRESHOLD] Calibration complete:")
    print(f"  - Optimal Validation Threshold: {selected['threshold']}")
    print(f"  - TRINETRA Recall at Threshold: {selected['recall']*100:.2f}%")
    print(f"  - TRINETRA FRR at Threshold:    {selected['frr']*100:.2f}%")
    print(f"  - Similar False Wake-Ups:       {selected['similar_fa']}")
    print(f"  - Background False Wake-Ups:    {selected['background_fa']}")
    print(f"[THRESHOLD] Results saved to:\n  CSV:  {csv_path}\n  JSON: {json_path}\n  Plot: {curve_plot}")

    return selected

if __name__ == "__main__":
    calibrate_and_plot_thresholds("TRINETRA_ML/models/best_ds_cnn.keras")
