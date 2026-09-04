#!/usr/bin/env python3
"""
TRINETRA ML - MFCC Feature Extraction & Demonstration Generator
Extracts deterministic MFCC features from 16kHz mono audio across train/val/test splits,
fits standardizer strictly on training data, and exports verification plots.
"""

import os
import sys
import csv
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import soundfile as sf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# Add parent directory for imports
script_dir = Path(__file__).resolve().parent
base_ml_dir = script_dir.parent
sys.path.insert(0, str(base_ml_dir))

from features.feature_config import DEFAULT_FEATURE_CONFIG, FeatureConfig
from features.mfcc import MFCCExtractor, FeatureStandardizer, fix_audio_length
from augmentation.augment import AudioAugmentor
from augmentation.augmentation_config import DEFAULT_AUG_CONFIG

def load_split_csv(split_csv_path: str, base_dir: Path) -> List[Dict[str, Any]]:
    records = []
    with open(split_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            # Resolve standardized audio path
            rel_path = r["standardized_path"]
            full_path = base_dir / rel_path
            if not full_path.exists():
                # Try fallback
                full_path = base_dir / "standardized" / rel_path.replace("standardized/", "")
            r["full_path"] = str(full_path)
            records.append(r)
    return records

def process_split_features(
    records: List[Dict[str, Any]],
    extractor: MFCCExtractor,
    label_to_class: Dict[str, int]
) -> Tuple[np.ndarray, np.ndarray, Dict[str, List]]:
    X_list = []
    y_list = []
    meta = {
        "ids": [],
        "labels": [],
        "speakers": [],
        "sources": [],
        "environments": [],
        "paths": []
    }

    for r in records:
        fpath = r["full_path"]
        lbl = r["label"]
        cls_idx = label_to_class.get(lbl, 1)

        mfcc = extractor.extract_from_file(fpath)
        X_list.append(mfcc)
        y_list.append(cls_idx)

        meta["ids"].append(r["id"])
        meta["labels"].append(lbl)
        meta["speakers"].append(r.get("speaker", "unknown"))
        meta["sources"].append(r.get("source", "unknown"))
        meta["environments"].append(r.get("environment", "none"))
        meta["paths"].append(r["standardized_path"])

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int64)

    return X, y, meta

def generate_mfcc_plots(
    extractor: MFCCExtractor,
    augmentor: AudioAugmentor,
    train_records: List[Dict[str, Any]],
    output_dir: Path
):
    output_dir.mkdir(parents=True, exist_ok=True)
    plt.style.use('default')

    # Find sample records for each category
    pos_rec = next((r for r in train_records if r["label"] == "positive"), None)
    neg_rec = next((r for r in train_records if r["label"] in ["negative", "similar"]), None)
    bg_rec = next((r for r in train_records if r["label"] == "background"), None)

    if not pos_rec or not neg_rec or not bg_rec:
        print("[WARN] Could not find sample records for all categories for plotting.")
        return

    # Load audio
    pos_audio, _ = sf.read(pos_rec["full_path"], dtype='float32')
    neg_audio, _ = sf.read(neg_rec["full_path"], dtype='float32')
    bg_audio, _ = sf.read(bg_rec["full_path"], dtype='float32')

    pos_fixed = fix_audio_length(pos_audio, 16000)
    neg_fixed = fix_audio_length(neg_audio, 16000)
    bg_fixed = fix_audio_length(bg_audio, 16000)

    # Augmented positive
    aug_pos_audio = augmentor.augment(pos_audio, label="positive")

    # Extract MFCCs
    pos_mfcc = extractor.extract_from_audio(pos_fixed)
    neg_mfcc = extractor.extract_from_audio(neg_fixed)
    bg_mfcc = extractor.extract_from_audio(bg_fixed)
    aug_pos_mfcc = extractor.extract_from_audio(aug_pos_audio)

    # 1. Waveform Examples Plot
    fig, axes = plt.subplots(4, 1, figsize=(10, 8), sharex=True)
    time_axis = np.linspace(0, 1.0, 16000)
    axes[0].plot(time_axis, pos_fixed, color='#2ecc71')
    axes[0].set_title("1. TRINETRA Wake-Word (Positive)", fontweight='bold')
    axes[0].grid(True, alpha=0.3)

    axes[1].plot(time_axis, neg_fixed, color='#e67e22')
    axes[1].set_title(f"2. UNKNOWN Speech / Hard Negative ({neg_rec['label']})", fontweight='bold')
    axes[1].grid(True, alpha=0.3)

    axes[2].plot(time_axis, bg_fixed, color='#3498db')
    axes[2].set_title(f"3. BACKGROUND Environmental Noise ({bg_rec.get('environment', 'noise')})", fontweight='bold')
    axes[2].grid(True, alpha=0.3)

    axes[3].plot(time_axis, aug_pos_audio, color='#9b59b6')
    axes[3].set_title("4. Augmented TRINETRA Wake-Word (Time Shift + Noise Mix + Gain)", fontweight='bold')
    axes[3].grid(True, alpha=0.3)
    axes[3].set_xlabel("Time (seconds)")
    plt.tight_layout()
    plt.savefig(output_dir / "waveform_examples.png", dpi=200)
    plt.close()

    # 2. Combined MFCC Examples Plot
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    im0 = axes[0, 0].imshow(pos_mfcc.T, aspect='auto', origin='lower', cmap='viridis')
    axes[0, 0].set_title("TRINETRA MFCC (Shape: 98x13)", fontweight='bold')
    axes[0, 0].set_ylabel("MFCC Coefficient")
    fig.colorbar(im0, ax=axes[0, 0])

    im1 = axes[0, 1].imshow(neg_mfcc.T, aspect='auto', origin='lower', cmap='viridis')
    axes[0, 1].set_title("UNKNOWN MFCC (Shape: 98x13)", fontweight='bold')
    fig.colorbar(im1, ax=axes[0, 1])

    im2 = axes[1, 0].imshow(bg_mfcc.T, aspect='auto', origin='lower', cmap='viridis')
    axes[1, 0].set_title("BACKGROUND MFCC (Shape: 98x13)", fontweight='bold')
    axes[1, 0].set_xlabel("Time Frame (10ms hop)")
    axes[1, 0].set_ylabel("MFCC Coefficient")
    fig.colorbar(im2, ax=axes[1, 0])

    im3 = axes[1, 1].imshow(aug_pos_mfcc.T, aspect='auto', origin='lower', cmap='viridis')
    axes[1, 1].set_title("Augmented TRINETRA MFCC (Shape: 98x13)", fontweight='bold')
    axes[1, 1].set_xlabel("Time Frame (10ms hop)")
    fig.colorbar(im3, ax=axes[1, 1])

    plt.tight_layout()
    plt.savefig(output_dir / "mfcc_examples.png", dpi=200)
    plt.close()

    # 3. Individual High-Res MFCC Figures
    for name, feat, title in [
        ("trinetra_mfcc.png", pos_mfcc, "TRINETRA Wake-Word MFCC Feature Representation"),
        ("unknown_mfcc.png", neg_mfcc, "UNKNOWN Audio MFCC Feature Representation"),
        ("background_mfcc.png", bg_mfcc, "BACKGROUND Environmental Noise MFCC Feature Representation"),
        ("augmented_trinetra_mfcc.png", aug_pos_mfcc, "Augmented TRINETRA Wake-Word MFCC")
    ]:
        fig, ax = plt.subplots(figsize=(9, 4.5))
        im = ax.imshow(feat.T, aspect='auto', origin='lower', cmap='magma')
        ax.set_title(title, fontsize=12, fontweight='bold')
        ax.set_xlabel("Time Frame Index (0 to 97)", fontsize=10)
        ax.set_ylabel("MFCC Index (0 to 12)", fontsize=10)
        cbar = fig.colorbar(im, ax=ax)
        cbar.set_label("Log Energy / Magnitude", fontsize=10)
        plt.tight_layout()
        plt.savefig(output_dir / name, dpi=200)
        plt.close()

    print(f"[PLOTS] Saved 6 demonstration plots in {output_dir}")

def run_feature_extraction(base_dir: str = "TRINETRA_ML"):
    base_path = Path(base_dir).resolve()
    splits_path = base_path / "splits"
    features_out_path = base_path / "features_data"
    reports_mfcc_path = base_path / "reports" / "mfcc"
    bg_audio_path = base_path / "standardized" / "background"

    features_out_path.mkdir(parents=True, exist_ok=True)
    reports_mfcc_path.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 60)
    print("TRINETRA ML — MFCC FEATURE EXTRACTION PIPELINE")
    print("=" * 60)

    # Initialize Extractor & Augmentor
    config = DEFAULT_FEATURE_CONFIG
    extractor = MFCCExtractor(config)
    augmentor = AudioAugmentor(background_dir=str(bg_audio_path))

    # 1. Load Splits
    train_records = load_split_csv(str(splits_path / "train.csv"), base_path)
    val_records = load_split_csv(str(splits_path / "validation.csv"), base_path)
    test_records = load_split_csv(str(splits_path / "test.csv"), base_path)

    print(f"[EXTRACT] Loaded splits:")
    print(f"  - Train:      {len(train_records)} files")
    print(f"  - Validation: {len(val_records)} files (100% UNMODIFIED)")
    print(f"  - Test:       {len(test_records)} files (100% UNMODIFIED)")

    # 2. Extract Base Features
    print(f"[EXTRACT] Extracting MFCC features from Train split...")
    X_train_raw, y_train, train_meta = process_split_features(train_records, extractor, config.label_to_class)

    print(f"[EXTRACT] Extracting MFCC features from Validation split...")
    X_val_raw, y_val, val_meta = process_split_features(val_records, extractor, config.label_to_class)

    print(f"[EXTRACT] Extracting MFCC features from Test split...")
    X_test_raw, y_test, test_meta = process_split_features(test_records, extractor, config.label_to_class)

    # 3. Fit Normalization Standardizer STRICTLY on Train Data
    print(f"[NORM] Fitting FeatureStandardizer strictly on Training split (Shape: {X_train_raw.shape})...")
    standardizer = FeatureStandardizer()
    standardizer.fit(X_train_raw)

    scaler_file = features_out_path / "feature_scaler.json"
    standardizer.save(str(scaler_file))
    print(f"[NORM] Saved normalization parameters to: {scaler_file}")

    # 4. Apply Normalization
    X_train_norm = standardizer.transform(X_train_raw)
    X_val_norm = standardizer.transform(X_val_raw)
    X_test_norm = standardizer.transform(X_test_raw)

    # 5. Save Features to Compressed NPZ
    train_npz = features_out_path / "train_features.npz"
    val_npz = features_out_path / "validation_features.npz"
    test_npz = features_out_path / "test_features.npz"

    np.savez_compressed(
        train_npz,
        X_raw=X_train_raw,
        X=X_train_norm,
        y=y_train,
        ids=np.array(train_meta["ids"]),
        labels=np.array(train_meta["labels"]),
        speakers=np.array(train_meta["speakers"]),
        sources=np.array(train_meta["sources"]),
        environments=np.array(train_meta["environments"]),
        paths=np.array(train_meta["paths"])
    )

    np.savez_compressed(
        val_npz,
        X_raw=X_val_raw,
        X=X_val_norm,
        y=y_val,
        ids=np.array(val_meta["ids"]),
        labels=np.array(val_meta["labels"]),
        speakers=np.array(val_meta["speakers"]),
        sources=np.array(val_meta["sources"]),
        environments=np.array(val_meta["environments"]),
        paths=np.array(val_meta["paths"])
    )

    np.savez_compressed(
        test_npz,
        X_raw=X_test_raw,
        X=X_test_norm,
        y=y_test,
        ids=np.array(test_meta["ids"]),
        labels=np.array(test_meta["labels"]),
        speakers=np.array(test_meta["speakers"]),
        sources=np.array(test_meta["sources"]),
        environments=np.array(test_meta["environments"]),
        paths=np.array(test_meta["paths"])
    )

    print(f"[OUTPUT] Saved feature sets to:")
    print(f"  - Train:      {train_npz}")
    print(f"  - Validation: {val_npz}")
    print(f"  - Test:       {test_npz}")

    # 6. Generate Verification & Demonstration Plots
    print(f"[PLOTS] Generating MFCC verification plots in {reports_mfcc_path}...")
    generate_mfcc_plots(extractor, augmentor, train_records, reports_mfcc_path)

    # 7. Summary Metrics
    summary = {
        "sample_rate": config.sample_rate,
        "target_duration_sec": config.target_duration_sec,
        "target_samples": config.target_samples,
        "win_length_ms": config.window_length_ms,
        "hop_length_ms": config.hop_length_ms,
        "n_mels": config.n_mels,
        "n_mfcc": config.n_mfcc,
        "input_tensor_shape": list(config.feature_shape),
        "train_samples": int(X_train_norm.shape[0]),
        "val_samples": int(X_val_norm.shape[0]),
        "test_samples": int(X_test_norm.shape[0]),
        "normalized_stats": {
            "train_mean": float(np.mean(X_train_norm)),
            "train_std": float(np.std(X_train_norm)),
            "train_min": float(np.min(X_train_norm)),
            "train_max": float(np.max(X_train_norm)),
            "val_mean": float(np.mean(X_val_norm)),
            "val_std": float(np.std(X_val_norm)),
            "test_mean": float(np.mean(X_test_norm)),
            "test_std": float(np.std(X_test_norm)),
        }
    }

    summary_file = features_out_path / "feature_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"[SUMMARY] Feature summary exported -> {summary_file}")
    return summary

if __name__ == "__main__":
    run_feature_extraction()
