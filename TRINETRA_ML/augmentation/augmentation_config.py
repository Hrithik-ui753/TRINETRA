"""
TRINETRA ML - Augmentation Configuration
Configured strictly for TRAINING SET ONLY.
"""

from dataclasses import dataclass
from typing import Tuple

@dataclass
class AugmentationConfig:
    random_seed: int = 42
    
    # Time shift (in milliseconds)
    time_shift_prob: float = 0.60
    max_time_shift_ms: float = 100.0  # +/- 100 ms

    # Gain / Volume perturbation (in dB)
    gain_perturb_prob: float = 0.60
    gain_db_range: Tuple[float, float] = (-4.0, 4.0)

    # Speed / Pitch perturbation
    speed_perturb_prob: float = 0.30
    speed_range: Tuple[float, float] = (0.95, 1.05)

    # Background noise mixing
    noise_mix_prob: float = 0.75
    noise_snr_db_range: Tuple[float, float] = (5.0, 20.0)

    # Mild room reverberation
    reverb_prob: float = 0.20
    reverb_decay_range: Tuple[float, float] = (0.1, 0.3)
    reverb_delay_ms_range: Tuple[float, float] = (15.0, 40.0)

DEFAULT_AUG_CONFIG = AugmentationConfig()
