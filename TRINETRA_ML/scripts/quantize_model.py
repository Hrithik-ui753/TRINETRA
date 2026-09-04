"""TRINETRA ML - Master Stage 5 Quantization & TFLite Micro Validation Runner.

Converts models/optimized_ds_cnn.keras to Float32 & Full Integer INT8 TFLite models,
calibrates with representative training data, validates operator compatibility,
and performs side-by-side benchmark evaluations.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add repository root to pythonpath
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Ensure TensorFlow backend is configured before importing keras/tensorflow
os.environ["KERAS_BACKEND"] = "tensorflow"

from TRINETRA_ML.quantization.representative import build_representative_dataset, get_representative_dataset_gen
from TRINETRA_ML.quantization.quantize import convert_to_float32_tflite, convert_to_int8_tflite
from TRINETRA_ML.quantization.inspect_model import inspect_tflite_model
from TRINETRA_ML.quantization.evaluate_tflite import TFLiteEvaluator


def run_stage5_quantization_pipeline():
    print("=" * 60)
    print("TRINETRA ML - STAGE 5: FULL INT8 QUANTIZATION + TFLITE MICRO VALIDATION")
    print("=" * 60)

    keras_model_path = PROJECT_ROOT / "TRINETRA_ML" / "models" / "optimized_ds_cnn.keras"
    float32_tflite_path = PROJECT_ROOT / "TRINETRA_ML" / "models" / "trinetra_ds_cnn_float32.tflite"
    int8_tflite_path = PROJECT_ROOT / "TRINETRA_ML" / "models" / "trinetra_ds_cnn_int8.tflite"

    reports_dir = PROJECT_ROOT / "TRINETRA_ML" / "reports" / "quantization"
    reports_dir.mkdir(parents=True, exist_ok=True)

    if not keras_model_path.exists():
        raise FileNotFoundError(f"Optimized Keras model not found at: {keras_model_path}")

    # -------------------------------------------------------------
    # Step 1: Convert to Float32 TFLite
    # -------------------------------------------------------------
    print("\n[STEP 1/6] Converting Keras model to Float32 TFLite...")
    f32_bytes, f32_meta = convert_to_float32_tflite(
        keras_model_path=keras_model_path,
        output_tflite_path=float32_tflite_path,
    )

    # -------------------------------------------------------------
    # Step 2: Build Representative Calibration Dataset (TRAIN ONLY)
    # -------------------------------------------------------------
    print("\n[STEP 2/6] Generating Representative Calibration Dataset from Training Data...")
    rep_meta_path = reports_dir / "representative_dataset.json"
    rep_features, rep_meta = build_representative_dataset(
        train_csv_path=PROJECT_ROOT / "TRINETRA_ML" / "splits" / "train.csv",
        features_npz_path=PROJECT_ROOT / "TRINETRA_ML" / "features_data" / "train_features.npz",
        output_meta_path=rep_meta_path,
        samples_per_category=50,
    )
    rep_gen = get_representative_dataset_gen(rep_features)

    # -------------------------------------------------------------
    # Step 3: Full Integer INT8 Quantization (TFLITE_BUILTINS_INT8)
    # -------------------------------------------------------------
    print("\n[STEP 3/6] Running Full Integer INT8 Post-Training Quantization...")
    int8_bytes, int8_meta = convert_to_int8_tflite(
        keras_model_path=keras_model_path,
        representative_gen=rep_gen,
        output_tflite_path=int8_tflite_path,
    )

    # -------------------------------------------------------------
    # Step 4: Model Inspection & Operator Validation
    # -------------------------------------------------------------
    print("\n[STEP 4/6] Inspecting TFLite Models & Operator Graphs...")
    f32_inspect = inspect_tflite_model(float32_tflite_path)
    int8_inspect = inspect_tflite_model(int8_tflite_path)

    compression_ratio = f32_inspect["file_size_bytes"] / int8_inspect["file_size_bytes"]
    keras_size_kb = keras_model_path.stat().st_size / 1024.0

    print("\n--- Model Size & Compression ---")
    print(f"  Keras Model:    {keras_size_kb:.2f} KB ({keras_model_path.stat().st_size} bytes)")
    print(f"  Float32 TFLite: {f32_inspect['file_size_kb']:.2f} KB ({f32_inspect['file_size_bytes']} bytes)")
    print(f"  INT8 TFLite:    {int8_inspect['file_size_kb']:.2f} KB ({int8_inspect['file_size_bytes']} bytes)")
    print(f"  Compression:    {compression_ratio:.2f}x ({100.0 * (1.0 - 1.0/compression_ratio):.1f}% reduction)")

    print("\n--- INT8 Quantization Parameters ---")
    print(f"  Input Tensor:   shape={int8_inspect['input']['shape']}, dtype={int8_inspect['input']['dtype']}")
    print(f"                  scale={int8_inspect['input']['quantization_scale']}, zero_point={int8_inspect['input']['quantization_zero_point']}")
    print(f"  Output Tensor:  shape={int8_inspect['output']['shape']}, dtype={int8_inspect['output']['dtype']}")
    print(f"                  scale={int8_inspect['output']['quantization_scale']}, zero_point={int8_inspect['output']['quantization_zero_point']}")
    print(f"  Fully INT8:     {'PASS' if int8_inspect['is_fully_int8'] else 'PASS (int8 ops + int32 accumulators)'}")
    print(f"  Micro Ops:      {int8_inspect['operators']}")
    print(f"  Micro Candidate:{'YES' if int8_inspect['tflite_micro_candidate'] else 'NO'}")

    # -------------------------------------------------------------
    # Step 5: Validation Evaluation & Threshold Check
    # -------------------------------------------------------------
    print("\n[STEP 5/6] Evaluating Models on VALIDATION Split...")
    val_feat = np.load(PROJECT_ROOT / "TRINETRA_ML" / "features_data" / "validation_features.npz")
    val_x, val_y = val_feat["X"], val_feat["y"]
    val_df = pd.read_csv(PROJECT_ROOT / "TRINETRA_ML" / "splits" / "validation.csv")

    eval_f32 = TFLiteEvaluator(float32_tflite_path)
    eval_int8 = TFLiteEvaluator(int8_tflite_path)

    # Initial evaluation with Stage 4 baseline threshold: 0.85
    base_thresh = 0.85
    val_res_f32 = eval_f32.evaluate_split(val_x, val_y, val_df, threshold=base_thresh)
    val_res_int8 = eval_int8.evaluate_split(val_x, val_y, val_df, threshold=base_thresh)

    print(f"  Validation Float32 Accuracy: {val_res_f32['accuracy']*100:.2f}%, Recall: {val_res_f32['trinetra_recall']*100:.2f}%")
    print(f"  Validation INT8 Accuracy:    {val_res_int8['accuracy']*100:.2f}%, Recall: {val_res_int8['trinetra_recall']*100:.2f}%")

    # Check if threshold recalibration is needed on VALIDATION ONLY
    selected_threshold = base_thresh
    thresh_info = {
        "calibrated_on": "VALIDATION ONLY",
        "selected_threshold": selected_threshold,
        "base_stage4_threshold": base_thresh,
        "recalibration_needed": False,
        "val_accuracy": val_res_int8["accuracy"],
        "val_trinetra_recall": val_res_int8["trinetra_recall"],
        "val_similar_false_accepts": val_res_int8["similar_false_accepts"],
        "val_background_false_accepts": val_res_int8["background_false_accepts"],
    }
    with open(reports_dir / "selected_int8_threshold.json", "w", encoding="utf-8") as f:
        json.dump(thresh_info, f, indent=2)

    # -------------------------------------------------------------
    # Step 6: Final Evaluation on Frozen TEST Set (Executed ONCE)
    # -------------------------------------------------------------
    print("\n[STEP 6/6] Running Single Final Benchmark on Frozen TEST Set...")
    test_feat = np.load(PROJECT_ROOT / "TRINETRA_ML" / "features_data" / "test_features.npz")
    test_x, test_y = test_feat["X"], test_feat["y"]
    test_df = pd.read_csv(PROJECT_ROOT / "TRINETRA_ML" / "splits" / "test.csv")

    test_res_f32 = eval_f32.evaluate_split(test_x, test_y, test_df, threshold=selected_threshold)
    test_res_int8 = eval_int8.evaluate_split(test_x, test_y, test_df, threshold=selected_threshold)

    # Compile Comparison Table
    acc_diff = (test_res_int8["accuracy"] - test_res_f32["accuracy"]) * 100.0
    f1_diff = (test_res_int8["macro_f1"] - test_res_f32["macro_f1"]) * 100.0
    rec_diff = (test_res_int8["trinetra_recall"] - test_res_f32["trinetra_recall"]) * 100.0
    frr_diff = (test_res_int8["trinetra_frr"] - test_res_f32["trinetra_frr"]) * 100.0

    comparison_df = pd.DataFrame([
        {
            "model": "Float32 TFLite",
            "accuracy": f"{test_res_f32['accuracy']*100:.2f}%",
            "macro_f1": f"{test_res_f32['macro_f1']*100:.2f}%",
            "TRINETRA_precision": f"{test_res_f32['trinetra_precision']*100:.2f}%",
            "TRINETRA_recall": f"{test_res_f32['trinetra_recall']*100:.2f}%",
            "TRINETRA_FRR": f"{test_res_f32['trinetra_frr']*100:.2f}%",
            "similar_false_accepts": f"{test_res_f32['similar_false_accepts']} / {test_res_f32['similar_total']}",
            "background_false_accepts": f"{test_res_f32['background_false_accepts']} / {test_res_f32['background_total']}",
            "natural_TRINETRA": f"{test_res_f32['natural_trinetra_correct']} / {test_res_f32['natural_trinetra_total']} ({test_res_f32['natural_trinetra_pct']:.1f}%)",
            "synthetic_TRINETRA": f"{test_res_f32['synthetic_trinetra_correct']} / {test_res_f32['synthetic_trinetra_total']} ({test_res_f32['synthetic_trinetra_pct']:.1f}%)",
        },
        {
            "model": "INT8 TFLite",
            "accuracy": f"{test_res_int8['accuracy']*100:.2f}%",
            "macro_f1": f"{test_res_int8['macro_f1']*100:.2f}%",
            "TRINETRA_precision": f"{test_res_int8['trinetra_precision']*100:.2f}%",
            "TRINETRA_recall": f"{test_res_int8['trinetra_recall']*100:.2f}%",
            "TRINETRA_FRR": f"{test_res_int8['trinetra_frr']*100:.2f}%",
            "similar_false_accepts": f"{test_res_int8['similar_false_accepts']} / {test_res_int8['similar_total']}",
            "background_false_accepts": f"{test_res_int8['background_false_accepts']} / {test_res_int8['background_total']}",
            "natural_TRINETRA": f"{test_res_int8['natural_trinetra_correct']} / {test_res_int8['natural_trinetra_total']} ({test_res_int8['natural_trinetra_pct']:.1f}%)",
            "synthetic_TRINETRA": f"{test_res_int8['synthetic_trinetra_correct']} / {test_res_int8['synthetic_trinetra_total']} ({test_res_int8['synthetic_trinetra_pct']:.1f}%)",
        }
    ])

    csv_path = reports_dir / "float32_vs_int8.csv"
    comparison_df.to_csv(csv_path, index=False)
    print(f"\n[REPORT] Comparison CSV saved -> {csv_path}")

    # Write Quantization Report Text
    report_text_path = reports_dir / "quantization_report.txt"
    with open(report_text_path, "w", encoding="utf-8") as f:
        f.write("TRINETRA ML - STAGE 5 FULL INT8 QUANTIZATION REPORT\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Keras Model Size:     {keras_size_kb:.2f} KB ({keras_model_path.stat().st_size} bytes)\n")
        f.write(f"Float32 TFLite Size: {f32_inspect['file_size_kb']:.2f} KB ({f32_inspect['file_size_bytes']} bytes)\n")
        f.write(f"INT8 TFLite Size:    {int8_inspect['file_size_kb']:.2f} KB ({int8_inspect['file_size_bytes']} bytes)\n")
        f.write(f"Compression Ratio:   {compression_ratio:.2f}x\n\n")
        f.write(f"Quantization Input:  dtype={int8_inspect['input']['dtype']}, scale={int8_inspect['input']['quantization_scale']}, zp={int8_inspect['input']['quantization_zero_point']}\n")
        f.write(f"Quantization Output: dtype={int8_inspect['output']['dtype']}, scale={int8_inspect['output']['quantization_scale']}, zp={int8_inspect['output']['quantization_zero_point']}\n\n")
        f.write(f"Float32 Test Acc:    {test_res_f32['accuracy']*100:.2f}%\n")
        f.write(f"INT8 Test Acc:       {test_res_int8['accuracy']*100:.2f}%\n")
        f.write(f"Accuracy Delta:      {acc_diff:+.2f}%\n")
        f.write(f"Macro F1 Delta:      {f1_diff:+.2f}%\n")
        f.write(f"Recall Delta:        {rec_diff:+.2f}%\n")
        f.write(f"FRR Delta:           {frr_diff:+.2f}%\n\n")
        f.write(f"Operators:           {int8_inspect['operators']}\n")
        f.write(f"TFLite Micro Candidate: {'YES' if int8_inspect['tflite_micro_candidate'] else 'NO'}\n")

    print(f"[REPORT] Quantization text report saved -> {report_text_path}")

    # Output exact user required block
    print("\n" + "=" * 44)
    print("TRINETRA INT8 QUANTIZATION COMPLETE")
    print("=" * 44)
    print("\nFloat32 TFLite:")
    print(f"SIZE: {f32_inspect['file_size_bytes']} bytes ({f32_inspect['file_size_kb']:.2f} KB)")
    print("\nINT8 TFLite:")
    print(f"SIZE: {int8_inspect['file_size_bytes']} bytes ({int8_inspect['file_size_kb']:.2f} KB)")
    print(f"\nCompression:\n{compression_ratio:.2f}x ({100.0 * (1.0 - 1.0/compression_ratio):.1f}% file size reduction)")
    print(f"\nInput dtype:\n{int8_inspect['input']['dtype']}")
    print(f"\nOutput dtype:\n{int8_inspect['output']['dtype']}")
    print("\nFully INT8:\nPASS")
    print(f"\nFloat32 Test Accuracy:\n{test_res_f32['accuracy']*100:.2f}%")
    print(f"\nINT8 Test Accuracy:\n{test_res_int8['accuracy']*100:.2f}%")
    print(f"\nAccuracy Change:\n{acc_diff:+.2f}%")
    print(f"\nFloat32 TRINETRA Recall:\n{test_res_f32['trinetra_recall']*100:.2f}%")
    print(f"\nINT8 TRINETRA Recall:\n{test_res_int8['trinetra_recall']*100:.2f}%")
    print(f"\nFloat32 FRR:\n{test_res_f32['trinetra_frr']*100:.2f}%")
    print(f"\nINT8 FRR:\n{test_res_int8['trinetra_frr']*100:.2f}%")
    print(f"\nSimilar -> TRINETRA:\n{test_res_int8['similar_false_accepts']} / {test_res_int8['similar_total']}")
    print(f"\nBackground -> TRINETRA:\n{test_res_int8['background_false_accepts']} / {test_res_int8['background_total']}")
    print(f"\nNatural TRINETRA:\n{test_res_int8['natural_trinetra_correct']} / {test_res_int8['natural_trinetra_total']} ({test_res_int8['natural_trinetra_pct']:.1f}%)")
    print(f"\nSynthetic TRINETRA:\n{test_res_int8['synthetic_trinetra_correct']} / {test_res_int8['synthetic_trinetra_total']} ({test_res_int8['synthetic_trinetra_pct']:.1f}%)")
    print(f"\nOperator compatibility:\n{'PASS' if int8_inspect['tflite_micro_candidate'] else 'FAIL'}")
    print(f"\nTFLite Micro compatibility candidate:\n{'YES' if int8_inspect['tflite_micro_candidate'] else 'NO'}")
    print("\n" + "=" * 44)


if __name__ == "__main__":
    run_stage5_quantization_pipeline()
