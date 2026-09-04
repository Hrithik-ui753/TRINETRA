"""
TRINETRA ML - MFCC Feature Extractor & Feature Standardizer
Extracts deterministic fixed-length MFCC features for wake-word activation models.
"""

import os
import json
from pathlib import Path
from typing import Union, Tuple, Optional
import numpy as np
import soundfile as sf
import librosa
from scipy.fftpack import dct

from .feature_config import FeatureConfig, DEFAULT_FEATURE_CONFIG

def fix_audio_length(audio: np.ndarray, target_samples: int = 16000) -> np.ndarray:
    """
    Ensures audio is exactly target_samples (1.0s at 16kHz).
    - If shorter: Symmetric zero padding (centered).
    - If longer: Energy-centered windowing (locates highest energy window of 16000 samples)
      to avoid cutting off wake words.
    """
    n_samples = len(audio)
    if n_samples == target_samples:
        return audio

    if n_samples < target_samples:
        pad_total = target_samples - n_samples
        pad_left = pad_total // 2
        pad_right = pad_total - pad_left
        return np.pad(audio, (pad_left, pad_right), mode='constant', constant_values=0.0)

    # If longer: Find window with maximum RMS energy
    hop = 160 # 10ms search step
    best_start = 0
    max_energy = -1.0
    
    for start in range(0, n_samples - target_samples + 1, hop):
        segment = audio[start : start + target_samples]
        energy = np.sum(segment ** 2)
        if energy > max_energy:
            max_energy = energy
            best_start = start

    return audio[best_start : best_start + target_samples]

class MFCCExtractor:
    """
    Edge-compatible MFCC Extractor.
    Extracts deterministic (n_frames, n_mfcc) feature matrices from 16kHz mono audio.
    """
    def __init__(self, config: Optional[FeatureConfig] = None):
        self.cfg = config or DEFAULT_FEATURE_CONFIG

        # Precompute Mel Filterbank
        self.mel_basis = librosa.filters.mel(
            sr=self.cfg.sample_rate,
            n_fft=self.cfg.n_fft,
            n_mels=self.cfg.n_mels,
            fmin=self.cfg.fmin,
            fmax=self.cfg.fmax,
            htk=True
        )

        # Precompute Hann Window
        self.window = np.hanning(self.cfg.win_length)

    def extract_from_audio(self, audio: np.ndarray) -> np.ndarray:
        """
        Processes a 1D float32 audio array and returns MFCC matrix of shape (n_frames, n_mfcc).
        """
        # 1. Enforce deterministic 1.0s window
        fixed_audio = fix_audio_length(audio, target_samples=self.cfg.target_samples)

        # 2. Compute Mel-spectrogram
        # Causal framing for edge microcontrollers
        if self.cfg.center_stft:
            stft = librosa.stft(
                fixed_audio,
                n_fft=self.cfg.n_fft,
                hop_length=self.cfg.hop_length,
                win_length=self.cfg.win_length,
                window=self.window,
                center=True
            )
        else:
            stft = librosa.stft(
                fixed_audio,
                n_fft=self.cfg.n_fft,
                hop_length=self.cfg.hop_length,
                win_length=self.cfg.win_length,
                window=self.window,
                center=False
            )

        magnitude_spectrogram = np.abs(stft) ** 2  # Power spectrogram
        mel_spectrogram = np.dot(self.mel_basis, magnitude_spectrogram)
        
        # Log compression (log-mel)
        log_mel = np.log(mel_spectrogram + 1e-6)

        # 3. Discrete Cosine Transform (DCT-II) across mel frequency bins
        # Shape: (n_mels, n_frames) -> DCT along axis 0 -> (n_mfcc, n_frames)
        mfcc = dct(log_mel, type=2, axis=0, norm='ortho')[: self.cfg.n_mfcc]

        # Transpose to (n_frames, n_mfcc)
        mfcc_t = mfcc.T.astype(np.float32)

        return mfcc_t

    def extract_from_file(self, filepath: str) -> np.ndarray:
        """
        Loads a WAV file and computes its MFCC matrix.
        """
        data, sr = sf.read(filepath, dtype='float32')
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        if sr != self.cfg.sample_rate:
            data = librosa.resample(data, orig_sr=sr, target_sr=self.cfg.sample_rate)
        return self.extract_from_audio(data)

class FeatureStandardizer:
    """
    Fits mean and standard deviation strictly on the TRAINING set
    and applies deterministic z-score normalization across all splits.
    """
    def __init__(self):
        self.mean: Optional[np.ndarray] = None
        self.std: Optional[np.ndarray] = None
        self.is_fitted: bool = False

    def fit(self, X_train: np.ndarray):
        """
        X_train shape: (N_samples, n_frames, n_mfcc) or (N_samples, ...)
        Calculates global mean and std per feature channel or globally.
        """
        # Compute mean and std per MFCC coefficient across all samples and frames
        self.mean = np.mean(X_train, axis=(0, 1), keepdims=True).astype(np.float32)
        self.std = np.std(X_train, axis=(0, 1), keepdims=True).astype(np.float32)
        # Prevent division by zero
        self.std[self.std < 1e-6] = 1.0
        self.is_fitted = True

    def transform(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("FeatureStandardizer must be fitted on training data before transforming.")
        return ((X - self.mean) / self.std).astype(np.float32)

    def save(self, filepath: str):
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted FeatureStandardizer.")
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        data = {
            "mean": self.mean.tolist(),
            "std": self.std.tolist(),
            "is_fitted": self.is_fitted
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def load(self, filepath: str):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.mean = np.array(data["mean"], dtype=np.float32)
        self.std = np.array(data["std"], dtype=np.float32)
        self.is_fitted = data.get("is_fitted", True)
