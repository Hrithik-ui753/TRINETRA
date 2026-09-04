"""
TRINETRA ML - Audio Augmentation Engine
Realistic, reproducible on-the-fly acoustic augmentation for the TRAINING split only:
- Small time shifts
- Controlled gain changes
- Mild speed perturbation
- Realistic background noise mixing (AC, fan, traffic, people talking, TV, music, random)
- Mild room reverberation
"""

import os
import random
from pathlib import Path
from typing import List, Optional, Dict, Any
import numpy as np
import soundfile as sf
import librosa
from scipy import signal

from .augmentation_config import AugmentationConfig, DEFAULT_AUG_CONFIG
from features.mfcc import fix_audio_length

class AudioAugmentor:
    """
    On-the-fly training data augmentor.
    Loads real background noise clips from TRINETRA background dataset.
    """
    def __init__(self, background_dir: Optional[str] = None, config: Optional[AugmentationConfig] = None):
        self.cfg = config or DEFAULT_AUG_CONFIG
        self.rng = np.random.RandomState(self.cfg.random_seed)
        self.noise_cache: Dict[str, List[np.ndarray]] = {}
        
        if background_dir and os.path.exists(background_dir):
            self._load_noise_files(background_dir)

    def _load_noise_files(self, background_dir: str):
        """
        Pre-indexes background noise clips partitioned by environment.
        """
        bg_path = Path(background_dir)
        for env_dir in bg_path.iterdir():
            if env_dir.is_dir():
                env_name = env_dir.name
                self.noise_cache[env_name] = []
                for wav_file in env_dir.glob("*.wav"):
                    try:
                        data, sr = sf.read(str(wav_file), dtype='float32')
                        if data.ndim > 1:
                            data = np.mean(data, axis=1)
                        if len(data) > 0:
                            self.noise_cache[env_name].append(data)
                    except Exception:
                        pass
        
        total_clips = sum(len(v) for v in self.noise_cache.values())
        print(f"[AUGMENT] Preloaded {total_clips} background noise clips across {len(self.noise_cache)} environments.")

    def time_shift(self, audio: np.ndarray, sample_rate: int = 16000) -> np.ndarray:
        max_shift_samples = int(self.cfg.max_time_shift_ms * sample_rate / 1000.0)
        shift = self.rng.randint(-max_shift_samples, max_shift_samples)
        if shift == 0:
            return audio
        return np.roll(audio, shift)

    def gain_perturb(self, audio: np.ndarray) -> np.ndarray:
        gain_db = self.rng.uniform(self.cfg.gain_db_range[0], self.cfg.gain_db_range[1])
        gain_linear = 10.0 ** (gain_db / 20.0)
        return audio * gain_linear

    def speed_perturb(self, audio: np.ndarray, sample_rate: int = 16000) -> np.ndarray:
        speed = self.rng.uniform(self.cfg.speed_range[0], self.cfg.speed_range[1])
        if abs(speed - 1.0) < 1e-3:
            return audio
        resampled = librosa.resample(audio, orig_sr=sample_rate, target_sr=int(sample_rate * speed))
        return fix_audio_length(resampled, target_samples=len(audio))

    def get_random_noise(self, target_len: int = 16000) -> Optional[np.ndarray]:
        if not self.noise_cache:
            return None
        # Choose a random environment
        env = self.rng.choice(list(self.noise_cache.keys()))
        clips = self.noise_cache[env]
        if not clips:
            return None
        clip = clips[self.rng.randint(len(clips))]
        
        # Crop or pad noise to target length
        if len(clip) < target_len:
            repeat_count = int(np.ceil(target_len / len(clip)))
            tiled = np.tile(clip, repeat_count)
            start = self.rng.randint(0, len(tiled) - target_len + 1)
            return tiled[start : start + target_len]
        elif len(clip) > target_len:
            start = self.rng.randint(0, len(clip) - target_len + 1)
            return clip[start : start + target_len]
        return clip

    def mix_background_noise(self, audio: np.ndarray, noise: np.ndarray, snr_db: Optional[float] = None) -> np.ndarray:
        if snr_db is None:
            snr_db = self.rng.uniform(self.cfg.noise_snr_db_range[0], self.cfg.noise_snr_db_range[1])
            
        speech_rms = np.sqrt(np.mean(audio ** 2))
        noise_rms = np.sqrt(np.mean(noise ** 2))
        
        if speech_rms < 1e-5 or noise_rms < 1e-5:
            return audio
            
        target_noise_rms = speech_rms / (10.0 ** (snr_db / 20.0))
        scaled_noise = noise * (target_noise_rms / (noise_rms + 1e-7))
        mixed = audio + scaled_noise
        return np.clip(mixed, -1.0, 1.0)

    def apply_reverb(self, audio: np.ndarray, sample_rate: int = 16000) -> np.ndarray:
        decay = self.rng.uniform(self.cfg.reverb_decay_range[0], self.cfg.reverb_decay_range[1])
        delay_ms = self.rng.uniform(self.cfg.reverb_delay_ms_range[0], self.cfg.reverb_delay_ms_range[1])
        delay_samples = int(delay_ms * sample_rate / 1000.0)
        
        # Simple finite impulse response multi-tap filter
        ir = np.zeros(delay_samples + 1, dtype=np.float32)
        ir[0] = 1.0
        ir[delay_samples] = decay
        
        filtered = signal.convolve(audio, ir, mode='same')
        return np.clip(filtered, -1.0, 1.0)

    def augment(self, audio: np.ndarray, label: str = "positive") -> np.ndarray:
        """
        Applies a random combination of realistic training augmentations to 1.0s audio.
        """
        aug_audio = fix_audio_length(audio, target_samples=16000).copy()

        # 1. Time shift
        if self.rng.rand() < self.cfg.time_shift_prob:
            aug_audio = self.time_shift(aug_audio)

        # 2. Speed perturbation
        if self.rng.rand() < self.cfg.speed_perturb_prob:
            aug_audio = self.speed_perturb(aug_audio)

        # 3. Room reverberation
        if self.rng.rand() < self.cfg.reverb_prob:
            aug_audio = self.apply_reverb(aug_audio)

        # 4. Background noise mixing (for speech classes: positive, negative, similar)
        if label != "background" and self.rng.rand() < self.cfg.noise_mix_prob:
            noise = self.get_random_noise(target_len=len(aug_audio))
            if noise is not None:
                aug_audio = self.mix_background_noise(aug_audio, noise)

        # 5. Gain perturbation
        if self.rng.rand() < self.cfg.gain_perturb_prob:
            aug_audio = self.gain_perturb(aug_audio)

        return np.clip(aug_audio, -1.0, 1.0).astype(np.float32)
