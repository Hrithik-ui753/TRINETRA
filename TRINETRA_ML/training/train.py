"""
TRINETRA ML - Baseline DS-CNN Training Engine
Trains the compact Depthwise-Separable CNN with on-the-fly training augmentation,
early stopping, learning rate decay, and history logging.
"""

import os
import sys
import csv
import random
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import soundfile as sf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

os.environ["KERAS_BACKEND"] = "torch"
import torch
import keras
from keras import callbacks

# Path imports
script_dir = Path(__file__).resolve().parent
base_ml_dir = script_dir.parent
sys.path.insert(0, str(base_ml_dir))

from features.feature_config import DEFAULT_FEATURE_CONFIG
from features.mfcc import MFCCExtractor, FeatureStandardizer
from augmentation.augment import AudioAugmentor
from training.model import build_dscnn_model

RANDOM_SEED = 42

def set_all_seeds(seed: int = RANDOM_SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

class AugmentedDataGenerator(keras.utils.PyDataset):
    """
    On-the-fly training data generator.
    Applies realistic audio augmentation and MFCC feature extraction dynamically for TRAIN set.
    """
    def __init__(
        self,
        audio_paths: List[str],
        labels: np.ndarray,
        extractor: MFCCExtractor,
        standardizer: FeatureStandardizer,
        augmentor: AudioAugmentor,
        batch_size: int = 32,
        augment: bool = True,
        shuffle: bool = True,
        seed: int = RANDOM_SEED
    ):
        super().__init__()
        self.audio_paths = audio_paths
        self.labels = labels
        self.extractor = extractor
        self.standardizer = standardizer
        self.augmentor = augmentor
        self.batch_size = batch_size
        self.augment = augment
        self.shuffle = shuffle
        self.rng = np.random.RandomState(seed)
        self.indices = np.arange(len(self.audio_paths))
        if self.shuffle:
            self.rng.shuffle(self.indices)

    def __len__(self):
        return int(np.ceil(len(self.audio_paths) / self.batch_size))

    def on_epoch_end(self):
        if self.shuffle:
            self.rng.shuffle(self.indices)

    def __getitem__(self, idx):
        batch_indices = self.indices[idx * self.batch_size : (idx + 1) * self.batch_size]
        batch_X = []
        batch_y = []

        for i in batch_indices:
            fpath = self.audio_paths[i]
            y_val = self.labels[i]

            try:
                data, sr = sf.read(fpath, dtype='float32')
                if data.ndim > 1:
                    data = np.mean(data, axis=1)

                if self.augment:
                    label_str = "background" if y_val == 0 else ("positive" if y_val == 2 else "negative")
                    data = self.augmentor.augment(data, label=label_str)

                mfcc = self.extractor.extract_from_audio(data)
                batch_X.append(mfcc)
                batch_y.append(y_val)
            except Exception:
                # Fallback to zero feature if error
                batch_X.append(np.zeros(self.extractor.cfg.feature_shape, dtype=np.float32))
                batch_y.append(y_val)

        X_arr = np.array(batch_X, dtype=np.float32)
        X_norm = self.standardizer.transform(X_arr)
        # Add channel dimension: (B, 97, 13, 1)
        X_out = np.expand_dims(X_norm, axis=-1)
        y_out = np.array(batch_y, dtype=np.int64)

        return X_out, y_out

def plot_training_curves(history_dict: Dict[str, list], output_dir: Path):
    output_dir.mkdir(parents=True, exist_ok=True)
    epochs = range(1, len(history_dict["loss"]) + 1)

    # 1. Loss Plot
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(epochs, history_dict["loss"], 'b-o', label="Training Loss", linewidth=2, markersize=4)
    ax.plot(epochs, history_dict["val_loss"], 'r-s', label="Validation Loss", linewidth=2, markersize=4)
    ax.set_title("TRINETRA DS-CNN — Training vs Validation Loss", fontsize=13, fontweight='bold')
    ax.set_xlabel("Epoch", fontsize=11)
    ax.set_ylabel("Sparse Categorical Cross-Entropy Loss", fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.legend(loc="upper right", fontsize=10)
    plt.tight_layout()
    plt.savefig(output_dir / "loss.png", dpi=200)
    plt.close()

    # 2. Accuracy Plot
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(epochs, [a * 100 for a in history_dict["accuracy"]], 'b-o', label="Training Accuracy", linewidth=2, markersize=4)
    ax.plot(epochs, [a * 100 for a in history_dict["val_accuracy"]], 'g-s', label="Validation Accuracy", linewidth=2, markersize=4)
    ax.set_title("TRINETRA DS-CNN — Training vs Validation Accuracy", fontsize=13, fontweight='bold')
    ax.set_xlabel("Epoch", fontsize=11)
    ax.set_ylabel("Accuracy (%)", fontsize=11)
    ax.grid(True, alpha=0.3)
    ax.legend(loc="lower right", fontsize=10)
    plt.tight_layout()
    plt.savefig(output_dir / "accuracy.png", dpi=200)
    plt.close()

    print(f"[PLOTS] Training curves saved in {output_dir}")

def train_dscnn(
    base_dir: str = "TRINETRA_ML",
    batch_size: int = 32,
    epochs: int = 50,
    learning_rate: float = 0.001
) -> Tuple[keras.Model, Dict[str, Any]]:
    set_all_seeds(RANDOM_SEED)

    base_path = Path(base_dir).resolve()
    models_dir = base_path / "models"
    reports_dir = base_path / "reports"
    train_plots_dir = reports_dir / "training"
    features_dir = base_path / "features_data"
    bg_dir = base_path / "standardized" / "background"

    models_dir.mkdir(parents=True, exist_ok=True)
    train_plots_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 60)
    print("TRINETRA DS-CNN MODEL TRAINING INITIALIZATION")
    print("=" * 60)
    print(f"Fixed Random Seed: {RANDOM_SEED}")
    print(f"Batch Size:        {batch_size}")
    print(f"Maximum Epochs:    {epochs}")
    print(f"Initial LR:        {learning_rate}")

    # Load pre-extracted feature arrays
    train_data = np.load(features_dir / "train_features.npz")
    val_data = np.load(features_dir / "validation_features.npz")
    test_data = np.load(features_dir / "test_features.npz")

    X_train = np.expand_dims(train_data["X"], axis=-1)
    y_train = train_data["y"]
    X_val = np.expand_dims(val_data["X"], axis=-1)
    y_val = val_data["y"]
    X_test = np.expand_dims(test_data["X"], axis=-1)
    y_test = test_data["y"]

    print(f"\n[DATA] Dataset Splits Loaded:")
    print(f"  - Train:      {X_train.shape[0]} samples (Shape: {X_train.shape})")
    print(f"  - Validation: {X_val.shape[0]} samples (Shape: {X_val.shape}) [UNMODIFIED]")
    print(f"  - Test:       {X_test.shape[0]} samples (Shape: {X_test.shape}) [UNMODIFIED, ISOLATED]")

    # Build DS-CNN Model
    input_shape = (X_train.shape[1], X_train.shape[2], 1)
    model = build_dscnn_model(input_shape=input_shape, num_classes=3)

    # Compile Model
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
        loss=keras.losses.SparseCategoricalCrossentropy(),
        metrics=["accuracy"]
    )

    # Setup Callbacks
    best_model_path = models_dir / "best_ds_cnn.keras"
    final_model_path = models_dir / "final_ds_cnn.keras"

    cb_list = [
        callbacks.EarlyStopping(
            monitor="val_loss",
            patience=12,
            restore_best_weights=True,
            verbose=1
        ),
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=4,
            min_lr=1e-5,
            verbose=1
        ),
        callbacks.ModelCheckpoint(
            filepath=str(best_model_path),
            monitor="val_loss",
            save_best_only=True,
            verbose=1
        )
    ]

    print("\n[TRAIN] Starting Model Training...")
    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=cb_list,
        verbose=1
    )

    # Save final model
    model.save(str(final_model_path))
    print(f"[MODEL] Saved best model to:  {best_model_path}")
    print(f"[MODEL] Saved final model to: {final_model_path}")

    # Export Training History CSV
    history_dict = history.history
    hist_csv_path = reports_dir / "training_history.csv"
    with open(hist_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["epoch", "loss", "accuracy", "val_loss", "val_accuracy", "learning_rate"])
        num_epochs_run = len(history_dict["loss"])
        for ep in range(num_epochs_run):
            loss_v = history_dict["loss"][ep]
            acc_v = history_dict["accuracy"][ep]
            val_loss_v = history_dict["val_loss"][ep]
            val_acc_v = history_dict["val_accuracy"][ep]
            lr_v = history_dict.get("learning_rate", [learning_rate] * num_epochs_run)[ep]
            if hasattr(lr_v, "item"):
                lr_v = lr_v.item()
            writer.writerow([ep + 1, loss_v, acc_v, val_loss_v, val_acc_v, lr_v])

    print(f"[HISTORY] Training history exported -> {hist_csv_path}")

    # Generate Training Curves
    plot_training_curves(history_dict, train_plots_dir)

    best_val_loss = float(np.min(history_dict["val_loss"]))
    best_val_acc = float(history_dict["val_accuracy"][int(np.argmin(history_dict["val_loss"]))])

    return model, {
        "best_val_loss": best_val_loss,
        "best_val_accuracy": best_val_acc,
        "epochs_trained": num_epochs_run,
        "best_model_path": str(best_model_path),
        "final_model_path": str(final_model_path)
    }

if __name__ == "__main__":
    train_dscnn()
