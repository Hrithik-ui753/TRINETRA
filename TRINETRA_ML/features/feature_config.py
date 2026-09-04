"""
TRINETRA ML - Feature Extraction Configuration
Targeted for Edge / ESP32-S3 Microcontroller Deployment & DS-CNN Model Architecture
"""

from dataclasses import dataclass

@dataclass
class FeatureConfig:
    # Audio sampling & duration parameters
    sample_rate: int = 16000
    target_duration_sec: float = 1.0
    target_samples: int = 16000  # 1.0s * 16000 Hz

    # Window & STFT parameters (Edge compatible)
    window_length_ms: float = 25.0  # 25 ms
    hop_length_ms: float = 10.0     # 10 ms
    n_fft: int = 512                # >= window_samples (400)
    win_length: int = 400           # 25ms @ 16kHz
    hop_length: int = 160           # 10ms @ 16kHz

    # Mel filterbank & MFCC parameters
    n_mels: int = 40
    n_mfcc: int = 13
    fmin: float = 20.0
    fmax: float = 8000.0
    center_stft: bool = False       # Causal/streaming edge alignment

    # Target ML Classes mapping
    label_to_class = {
        "background": 0,
        "negative": 1,
        "similar": 1,
        "positive": 2
    }
    
    class_to_name = {
        0: "BACKGROUND",
        1: "UNKNOWN",
        2: "TRINETRA"
    }

    # Deterministic input tensor shape: (n_frames, n_mfcc)
    # With 16000 samples, win=400, hop=160, center=False:
    # n_frames = (16000 - 400) // 160 + 1 = 98 frames
    @property
    def expected_n_frames(self) -> int:
        if self.center_stft:
            return self.target_samples // self.hop_length + 1
        return (self.target_samples - self.n_fft) // self.hop_length + 1

    @property
    def feature_shape(self) -> tuple:
        return (self.expected_n_frames, self.n_mfcc)

DEFAULT_FEATURE_CONFIG = FeatureConfig()
