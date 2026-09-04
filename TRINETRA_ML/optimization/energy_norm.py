"""
TRINETRA ML - Energy Normalization (ENF) Engine
Conservative input-level speech energy normalization to reduce acoustic variance
caused by microphone distance, speaker volume, and background gain differences.
"""

import numpy as np

def normalize_audio_energy(audio: np.ndarray, target_rms: float = 0.05, eps: float = 1e-6) -> np.ndarray:
    """
    Normalizes 1D audio waveform energy to a consistent target RMS level.
    Applies soft-clipping (tanh / clip) to prevent clipping distortion.
    """
    current_rms = np.sqrt(np.mean(audio ** 2))
    if current_rms < 1e-4:
        return audio
    
    scale_factor = target_rms / (current_rms + eps)
    # Constrain extreme amplification (max 6x boost)
    scale_factor = np.clip(scale_factor, 0.25, 4.0)
    
    scaled_audio = audio * scale_factor
    return np.clip(scaled_audio, -1.0, 1.0)

def apply_cepstral_energy_norm(mfcc: np.ndarray) -> np.ndarray:
    """
    Applies Cepstral Mean Normalization (CMN) across time frames for each MFCC channel.
    Shape: (n_frames, n_mfcc) e.g. (97, 13)
    """
    mean_vec = np.mean(mfcc, axis=0, keepdims=True)
    std_vec = np.std(mfcc, axis=0, keepdims=True)
    std_vec[std_vec < 1e-6] = 1.0
    return ((mfcc - mean_vec) / std_vec).astype(np.float32)
