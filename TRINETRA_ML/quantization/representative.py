"""TRINETRA ML - Representative Dataset Generator for INT8 Quantization.

Strictly uses TRAINING DATA ONLY to generate calibration tensors for post-training quantization.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Callable, Generator, List, Tuple
import numpy as np
import pandas as pd


def build_representative_dataset(
    train_csv_path: str | Path = "TRINETRA_ML/splits/train.csv",
    features_npz_path: str | Path = "TRINETRA_ML/features_data/train_features.npz",
    output_meta_path: str | Path = "TRINETRA_ML/reports/quantization/representative_dataset.json",
    samples_per_category: int = 50,
) -> Tuple[np.ndarray, dict]:
    """Select a balanced, acoustically diverse representative dataset from TRAINING split only."""
    train_csv_path = Path(train_csv_path)
    features_npz_path = Path(features_npz_path)
    output_meta_path = Path(output_meta_path)
    output_meta_path.parent.mkdir(parents=True, exist_ok=True)

    df_train = pd.read_csv(train_csv_path)
    feat_data = np.load(features_npz_path)
    features = feat_data["X"]
    labels = feat_data["y"]

    # Verify alignment
    assert len(df_train) == len(features), f"Mismatch between train metadata ({len(df_train)}) and features ({len(features)})"

    # Select balanced representation across key categories using both string labels and integer classes
    categories = {
        "natural_trinetra": (df_train["ml_class"] == "TRINETRA") & (df_train["source"] == "natural"),
        "synthetic_trinetra": (df_train["ml_class"] == "TRINETRA") & (df_train["source"] == "synthetic"),
        "similar_sounds": (df_train["ml_class"] == "UNKNOWN") & (df_train["label"] == "similar"),
        "negative_speech": (df_train["ml_class"] == "UNKNOWN") & (df_train["label"] == "negative"),
        "background_noise": (df_train["ml_class"] == "BACKGROUND"),
    }

    selected_indices: List[int] = []
    np.random.seed(42)

    for cat_name, mask in categories.items():
        cat_indices = df_train[mask].index.to_numpy()
        n_available = len(cat_indices)
        n_take = min(samples_per_category, n_available)
        if n_take > 0:
            chosen = np.random.choice(cat_indices, size=n_take, replace=False)
            selected_indices.extend(chosen.tolist())

    # Sort indices to maintain reproducibility
    selected_indices = sorted(list(set(selected_indices)))
    rep_features = features[selected_indices].astype(np.float32)

    # Ensure shape is (N, 97, 13, 1)
    if rep_features.ndim == 3:
        rep_features = np.expand_dims(rep_features, axis=-1)

    # Compile audit metadata
    selected_df = df_train.iloc[selected_indices]
    meta = {
        "total_calibration_samples": len(selected_indices),
        "feature_shape": list(rep_features.shape[1:]),
        "split_source": "TRAINING SPLIT ONLY (splits/train.csv)",
        "validation_or_test_used": False,
        "class_distribution": {
            "0_BACKGROUND": int((selected_df["ml_class"] == "BACKGROUND").sum()),
            "1_UNKNOWN": int((selected_df["ml_class"] == "UNKNOWN").sum()),
            "2_TRINETRA": int((selected_df["ml_class"] == "TRINETRA").sum()),
        },
        "source_distribution": {
            "natural_trinetra": int(((selected_df["ml_class"] == "TRINETRA") & (selected_df["source"] == "natural")).sum()),
            "synthetic_trinetra": int(((selected_df["ml_class"] == "TRINETRA") & (selected_df["source"] == "synthetic")).sum()),
            "similar_hard_negatives": int(((selected_df["ml_class"] == "UNKNOWN") & (selected_df["label"] == "similar")).sum()),
            "negative_general_speech": int(((selected_df["ml_class"] == "UNKNOWN") & (selected_df["label"] == "negative")).sum()),
            "background_environmental_noise": int((selected_df["ml_class"] == "BACKGROUND").sum()),
        },
    }

    with open(output_meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"[REPRESENTATIVE] Generated {len(rep_features)} calibration samples from training set.")
    print(f"[REPRESENTATIVE] Metadata saved to: {output_meta_path}")

    return rep_features, meta


def get_representative_dataset_gen(features: np.ndarray) -> Callable[[], Generator[List[np.ndarray], None, None]]:
    """Return a generator yielding single-item batches formatted for TFLiteConverter."""
    def generator():
        for i in range(len(features)):
            sample = features[i]
            if sample.ndim == 2:
                sample = sample.reshape((1, 97, 13, 1))
            elif sample.ndim == 3:
                sample = np.expand_dims(sample, axis=0)
            yield [sample.astype(np.float32)]
    return generator
