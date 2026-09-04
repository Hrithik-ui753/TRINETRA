"""TRINETRA ML - Standalone TFLite Validation Script.

Evaluates any TFLite model on a specified dataset split with detailed class and wake-word breakdown.
Usage:
    python TRINETRA_ML/scripts/validate_tflite.py --model TRINETRA_ML/models/trinetra_ds_cnn_int8.tflite --split test
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from TRINETRA_ML.quantization.evaluate_tflite import TFLiteEvaluator
from TRINETRA_ML.quantization.inspect_model import inspect_tflite_model


def main():
    parser = argparse.ArgumentParser(description="TRINETRA TFLite Model Validation")
    parser.add_argument("--model", type=str, default="TRINETRA_ML/models/trinetra_ds_cnn_int8.tflite", help="Path to .tflite file")
    parser.add_argument("--split", type=str, default="test", choices=["train", "validation", "test"], help="Dataset split to evaluate")
    parser.add_argument("--threshold", type=float, default=0.85, help="TRINETRA wake-word detection threshold")
    args = parser.parse_args()

    model_path = Path(args.model)
    if not model_path.exists():
        print(f"Error: Model {model_path} not found.")
        sys.exit(1)

    print(f"--- Validating TFLite Model: {model_path.name} on split: {args.split.upper()} ---")
    inspect_res = inspect_tflite_model(model_path)
    print(f"File Size:  {inspect_res['file_size_kb']:.2f} KB ({inspect_res['file_size_bytes']} bytes)")
    print(f"Input:      dtype={inspect_res['input']['dtype']}, shape={inspect_res['input']['shape']}")
    print(f"Output:     dtype={inspect_res['output']['dtype']}, shape={inspect_res['output']['shape']}")
    print(f"Operators:  {inspect_res['operators']}")

    feat_path = PROJECT_ROOT / "TRINETRA_ML" / "features_data" / f"{args.split}_features.npz"
    csv_path = PROJECT_ROOT / "TRINETRA_ML" / "splits" / f"{args.split}.csv"

    feat_data = np.load(feat_path)
    features, labels = feat_data["X"], feat_data["y"]
    df_meta = pd.read_csv(csv_path)

    evaluator = TFLiteEvaluator(model_path)
    res = evaluator.evaluate_split(features, labels, df_meta, threshold=args.threshold)

    print("\n--- Evaluation Results ---")
    print(f"Total Samples:       {res['total_samples']}")
    print(f"Threshold:           {args.threshold}")
    print(f"Accuracy:            {res['accuracy']*100:.2f}%")
    print(f"Macro F1:            {res['macro_f1']*100:.2f}%")
    print(f"TRINETRA Precision:  {res['trinetra_precision']*100:.2f}%")
    print(f"TRINETRA Recall:     {res['trinetra_recall']*100:.2f}%")
    print(f"TRINETRA FRR:        {res['trinetra_frr']*100:.2f}%")
    print(f"Similar FA:          {res['similar_false_accepts']} / {res['similar_total']}")
    print(f"Background FA:       {res['background_false_accepts']} / {res['background_total']}")
    print(f"Natural TRINETRA:    {res['natural_trinetra_correct']} / {res['natural_trinetra_total']} ({res['natural_trinetra_pct']:.1f}%)")
    print(f"Synthetic TRINETRA:  {res['synthetic_trinetra_correct']} / {res['synthetic_trinetra_total']} ({res['synthetic_trinetra_pct']:.1f}%)")


if __name__ == "__main__":
    main()
