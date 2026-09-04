"""
TRINETRA ML - Evaluation & Wake-Word Analysis Engine
Evaluates DS-CNN baseline on Validation and Test sets:
- Standard classification metrics (Macro/Weighted Precision, Recall, F1)
- Confusion Matrix visualization
- Wake-word specific metrics (TRINETRA FRR, recall, false acceptance counts)
- Hard negative breakdown (similar vs negative vs background -> TRINETRA)
- Natural vs Synthetic TRINETRA performance breakdown
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

os.environ["KERAS_BACKEND"] = "torch"
import keras

CLASS_NAMES = ["BACKGROUND", "UNKNOWN", "TRINETRA"]

def plot_confusion_matrix(cm: np.ndarray, class_names: list, output_path: Path):
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    im = ax.imshow(cm, interpolation='nearest', cmap='Blues')
    ax.figure.colorbar(im, ax=ax)
    
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=class_names,
        yticklabels=class_names,
        title="TRINETRA DS-CNN — Test Set Confusion Matrix",
        ylabel="True Ground-Truth Class",
        xlabel="Predicted Class"
    )

    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, format(cm[i, j], 'd'),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontsize=12, fontweight='bold'
            )
            
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()

def evaluate_model(
    model_path: str = "TRINETRA_ML/models/best_ds_cnn.keras",
    features_dir: str = "TRINETRA_ML/features_data",
    reports_dir: str = "TRINETRA_ML/reports"
) -> Dict[str, Any]:
    eval_dir = Path(reports_dir) / "evaluation"
    eval_dir.mkdir(parents=True, exist_ok=True)
    f_path = Path(features_dir)

    print("\n" + "=" * 60)
    print("TRINETRA DS-CNN EVALUATION & WAKE-WORD ANALYSIS")
    print("=" * 60)

    # 1. Load Model
    model = keras.models.load_model(model_path)
    print(f"[EVAL] Loaded model from: {model_path}")

    # 2. Load Validation & Test Data
    val_data = np.load(f_path / "validation_features.npz")
    test_data = np.load(f_path / "test_features.npz")

    X_val = np.expand_dims(val_data["X"], axis=-1)
    y_val = val_data["y"]
    
    X_test = np.expand_dims(test_data["X"], axis=-1)
    y_test = test_data["y"]
    test_labels = test_data["labels"]
    test_sources = test_data["sources"]
    test_speakers = test_data["speakers"]

    # 3. Validation Performance
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"[EVAL] Validation Set ({len(X_val)} samples): Loss = {val_loss:.4f}, Accuracy = {val_acc*100:.2f}%")

    # 4. Test Performance (Strictly Single Evaluation)
    print(f"[EVAL] Evaluating ONCE on Unseen Isolated Test Set ({len(X_test)} samples)...")
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    y_test_probs = model.predict(X_test, verbose=0)
    y_test_preds = np.argmax(y_test_probs, axis=1)

    # Confusion Matrix & Classification Metrics
    cm = confusion_matrix(y_test, y_test_preds, labels=[0, 1, 2])
    cr_text = classification_report(y_test, y_test_preds, target_names=CLASS_NAMES, digits=4)
    
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(y_test, y_test_preds, average='macro')
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(y_test, y_test_preds, average='weighted')

    # Save Confusion Matrix Plot
    cm_plot_path = eval_dir / "confusion_matrix.png"
    plot_confusion_matrix(cm, CLASS_NAMES, cm_plot_path)

    # Save Classification Report Text
    cr_path = eval_dir / "classification_report.txt"
    with open(cr_path, "w", encoding="utf-8") as f:
        f.write("TRINETRA DS-CNN BASELINE — TEST SET CLASSIFICATION REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Test Accuracy:         {test_acc*100:.2f}%\n")
        f.write(f"Macro Precision:       {p_macro*100:.2f}%\n")
        f.write(f"Macro Recall:          {r_macro*100:.2f}%\n")
        f.write(f"Macro F1-Score:        {f1_macro*100:.2f}%\n")
        f.write(f"Weighted F1-Score:     {f1_weighted*100:.2f}%\n\n")
        f.write("-" * 60 + "\n")
        f.write(cr_text + "\n\n")
        f.write("-" * 60 + "\n")
        f.write("CONFUSION MATRIX:\n")
        f.write(f"                Pred BG    Pred UNK   Pred TRINETRA\n")
        f.write(f"True BG         {cm[0, 0]:7d}    {cm[0, 1]:7d}    {cm[0, 2]:7d}\n")
        f.write(f"True UNK        {cm[1, 0]:7d}    {cm[1, 1]:7d}    {cm[1, 2]:7d}\n")
        f.write(f"True TRINETRA   {cm[2, 0]:7d}    {cm[2, 1]:7d}    {cm[2, 2]:7d}\n")

    # 5. Wake-Word Specific Metrics
    # Target Class 2 = TRINETRA
    total_trinetra_test = int(np.sum(y_test == 2))
    trinetra_tp = int(cm[2, 2])
    trinetra_fn = total_trinetra_test - trinetra_tp
    trinetra_recall = (trinetra_tp / total_trinetra_test) if total_trinetra_test > 0 else 0.0
    trinetra_frr = (trinetra_fn / total_trinetra_test) if total_trinetra_test > 0 else 0.0

    # False Acceptances to TRINETRA (non-wake word predicted as wake word)
    unknown_to_trinetra = int(cm[1, 2])
    bg_to_trinetra = int(cm[0, 2])
    total_false_accepts = unknown_to_trinetra + bg_to_trinetra

    # 6. Hard Negative Analysis (original folder labels: 'negative', 'similar', 'background')
    similar_to_trinetra = 0
    negative_to_trinetra = 0
    background_to_trinetra = 0

    similar_total = 0
    negative_total = 0
    background_total = 0

    for i in range(len(y_test)):
        orig_lbl = test_labels[i]
        pred_cls = y_test_preds[i]

        if orig_lbl == "similar":
            similar_total += 1
            if pred_cls == 2:  # Predicted TRINETRA
                similar_to_trinetra += 1
        elif orig_lbl == "negative":
            negative_total += 1
            if pred_cls == 2:
                negative_to_trinetra += 1
        elif orig_lbl == "background":
            background_total += 1
            if pred_cls == 2:
                background_to_trinetra += 1

    # 7. Natural vs Synthetic Analysis
    nat_trinetra_total = 0
    nat_trinetra_correct = 0
    syn_trinetra_total = 0
    syn_trinetra_correct = 0

    for i in range(len(y_test)):
        if y_test[i] == 2:  # TRINETRA ground truth
            src = test_sources[i]
            if src == "natural":
                nat_trinetra_total += 1
                if y_test_preds[i] == 2:
                    nat_trinetra_correct += 1
            elif src == "synthetic":
                syn_trinetra_total += 1
                if y_test_preds[i] == 2:
                    syn_trinetra_correct += 1

    nat_perf_str = f"{nat_trinetra_correct}/{nat_trinetra_total} ({nat_trinetra_correct/nat_trinetra_total*100:.1f}%)" if nat_trinetra_total > 0 else "N/A"
    syn_perf_str = f"{syn_trinetra_correct}/{syn_trinetra_total} ({syn_trinetra_correct/syn_trinetra_total*100:.1f}%)" if syn_trinetra_total > 0 else "N/A"

    # Save Wake-Word Metrics Text Report
    ww_path = eval_dir / "wake_word_metrics.txt"
    with open(ww_path, "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("TRINETRA WAKE-WORD SPECIFIC METRICS & FALSE WAKE-UP ANALYSIS\n")
        f.write("=" * 60 + "\n\n")
        f.write("1. TRINETRA ACTIVATION PERFORMANCE:\n")
        f.write(f"   - Total Positive Test Clips:        {total_trinetra_test}\n")
        f.write(f"   - True Wake-Word Detections (TP):   {trinetra_tp}\n")
        f.write(f"   - Missed Wake-Words (FN):           {trinetra_fn}\n")
        f.write(f"   - TRINETRA Recall (TPR):            {trinetra_recall*100:.2f}%\n")
        f.write(f"   - False Rejection Rate (FRR):       {trinetra_frr*100:.2f}%\n\n")

        f.write("2. FALSE ACCEPTANCE (FALSE WAKE-UP) BEHAVIOR:\n")
        f.write(f"   - UNKNOWN -> TRINETRA False Accepts:    {unknown_to_trinetra}\n")
        f.write(f"   - BACKGROUND -> TRINETRA False Accepts: {bg_to_trinetra}\n")
        f.write(f"   - Total False Wake-Up Events:           {total_false_accepts}\n\n")

        f.write("3. HARD NEGATIVE GRANULAR ANALYSIS:\n")
        f.write(f"   - Hard Negative ('similar') False Accepts:  {similar_to_trinetra} / {similar_total}\n")
        f.write(f"   - Regular Speech ('negative') False Accepts: {negative_to_trinetra} / {negative_total}\n")
        f.write(f"   - Environment ('background') False Accepts: {background_to_trinetra} / {background_total}\n\n")

        f.write("4. SOURCE PERFORMANCE BREAKDOWN (TRINETRA WAKE-WORD):\n")
        f.write(f"   - Natural TRINETRA Accuracy:   {nat_perf_str}\n")
        f.write(f"   - Synthetic TRINETRA Accuracy: {syn_perf_str}\n")
        f.write("=" * 60 + "\n")

    print(f"[EVAL] Classification report saved -> {cr_path}")
    print(f"[EVAL] Wake-word metrics saved     -> {ww_path}")
    print(f"[EVAL] Confusion matrix plot saved -> {cm_plot_path}")

    return {
        "val_loss": val_loss,
        "val_accuracy": val_acc,
        "test_loss": test_loss,
        "test_accuracy": test_acc,
        "test_macro_f1": f1_macro,
        "trinetra_recall": trinetra_recall,
        "trinetra_frr": trinetra_frr,
        "unknown_to_trinetra": unknown_to_trinetra,
        "bg_to_trinetra": bg_to_trinetra,
        "similar_to_trinetra": similar_to_trinetra,
        "nat_trinetra_perf": nat_perf_str,
        "syn_trinetra_perf": syn_perf_str,
        "confusion_matrix": cm
    }

if __name__ == "__main__":
    evaluate_model()
