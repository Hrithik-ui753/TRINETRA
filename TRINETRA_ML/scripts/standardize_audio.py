#!/usr/bin/env python3
"""
TRINETRA ML - Audio Standardization Script
Converts all audio files (WAV, M4A, MP4, etc.) to:
- 16000 Hz sample rate
- Mono (1 channel)
- 16-bit signed PCM WAV

Organizes standardized audio cleanly:
TRINETRA_ML/standardized/
├── positive/
├── negative/
├── similar/
└── background/
    ├── ac/
    ├── fan/
    ├── music/
    ├── people_talking/
    ├── random/
    ├── traffic/
    └── tv/

Maintains original -> standardized file mapping.
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import soundfile as sf
import librosa
import av

TARGET_SR = 16000
TARGET_CHANNELS = 1
TARGET_SUBTYPE = 'PCM_16'

def load_audio_as_mono_16k(filepath: str) -> Tuple[np.ndarray, int]:
    """
    Loads any supported audio/video file (WAV, M4A, MP4) and returns
    (audio_float32_mono, sample_rate_16000).
    """
    ext = os.path.splitext(filepath)[1].lower()
    
    # Try soundfile first for standard wav
    if ext == ".wav":
        try:
            data, sr = sf.read(filepath, dtype='float32')
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            if sr != TARGET_SR:
                data = librosa.resample(data, orig_sr=sr, target_sr=TARGET_SR)
            return data, TARGET_SR
        except Exception:
            pass # Fall back to PyAV

    # PyAV decoder for MP4, M4A, AAC, and non-standard WAVs
    container = av.open(filepath)
    audio_streams = [s for s in container.streams if s.type == 'audio']
    if not audio_streams:
        container.close()
        raise ValueError(f"No audio stream found in {filepath}")
    
    stream = audio_streams[0]
    sr = stream.codec_context.sample_rate or stream.rate
    if not sr:
        sr = 44100 # default fallback
        
    frames = []
    for frame in container.decode(stream):
        plane = frame.to_ndarray()
        frames.append(plane)
    container.close()

    if not frames:
        raise ValueError(f"Empty audio frames decoded from {filepath}")

    # Combine frames
    raw_audio = np.concatenate(frames, axis=-1)
    
    # Handle int vs float
    if np.issubdtype(raw_audio.dtype, np.integer):
        max_v = float(np.iinfo(raw_audio.dtype).max)
        raw_audio = raw_audio.astype(np.float32) / max_v
    else:
        raw_audio = raw_audio.astype(np.float32)

    # Convert to mono
    if raw_audio.ndim > 1:
        if raw_audio.shape[0] > 1:
            raw_audio = np.mean(raw_audio, axis=0)
        else:
            raw_audio = raw_audio[0]

    # Resample if needed
    if sr != TARGET_SR:
        raw_audio = librosa.resample(raw_audio, orig_sr=sr, target_sr=TARGET_SR)

    return raw_audio, TARGET_SR

def save_standardized_wav(audio_data: np.ndarray, output_path: str):
    """
    Saves float32 audio as 16-bit signed PCM WAV.
    Clips float data to [-1.0, 1.0] to prevent overflow distortion.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Clip audio
    audio_clipped = np.clip(audio_data, -1.0, 1.0)
    sf.write(output_path, audio_clipped, TARGET_SR, subtype=TARGET_SUBTYPE, format='WAV')

def standardize_dataset(raw_dir: str, standardized_dir: str, mapping_path: str) -> Dict[str, Any]:
    raw_path = Path(raw_dir)
    std_path = Path(standardized_dir)
    std_path.mkdir(parents=True, exist_ok=True)

    counters = {
        "positive": 0,
        "negative": 0,
        "similar": 0,
        "background": {}
    }

    mapping = []
    failed_files = []

    # Walk raw directory
    for root, _, files in sorted(os.walk(raw_path)):
        for f in sorted(files):
            raw_file_path = os.path.join(root, f)
            rel_path = os.path.relpath(raw_file_path, raw_path).replace("\\", "/")
            parts = rel_path.split("/")
            if parts and parts[0].lower() in ["audio-clips", "audio_clips", "raw"]:
                parts = parts[1:]

            if not parts:
                continue

            # Determine category
            category = parts[0].lower()
            label = "unknown"
            env = None
            dest_dir = None
            dest_filename = None

            if "positive" in category:
                label = "positive"
                counters["positive"] += 1
                dest_dir = std_path / "positive"
                dest_filename = f"positive_{counters['positive']:06d}.wav"
            elif "negative" in category:
                label = "negative"
                counters["negative"] += 1
                dest_dir = std_path / "negative"
                dest_filename = f"negative_{counters['negative']:06d}.wav"
            elif "similar" in category:
                label = "similar"
                counters["similar"] += 1
                dest_dir = std_path / "similar"
                dest_filename = f"similar_{counters['similar']:06d}.wav"
            elif "noise" in category or "background" in category:
                label = "background"
                # Determine environment subfolder
                if len(parts) > 2:
                    env = parts[1].lower()
                elif len(parts) == 2 and not parts[1].lower().endswith(('.wav', '.m4a', '.mp4')):
                    env = parts[1].lower()
                else:
                    env = "random"
                
                if env not in counters["background"]:
                    counters["background"][env] = 0
                counters["background"][env] += 1
                
                dest_dir = std_path / "background" / env
                dest_filename = f"background_{env}_{counters['background'][env]:06d}.wav"
            else:
                label = "other"
                dest_dir = std_path / "other"
                dest_filename = f"other_{f}.wav"

            target_full_path = dest_dir / dest_filename

            try:
                audio_data, sr = load_audio_as_mono_16k(raw_file_path)
                save_standardized_wav(audio_data, str(target_full_path))
                
                mapping.append({
                    "original_relative_path": rel_path,
                    "original_full_path": os.path.abspath(raw_file_path),
                    "original_filename": f,
                    "original_extension": os.path.splitext(f)[1].lower(),
                    "standardized_relative_path": os.path.relpath(target_full_path, std_path.parent).replace("\\", "/"),
                    "standardized_full_path": os.path.abspath(target_full_path),
                    "standardized_filename": dest_filename,
                    "label": label,
                    "environment": env
                })
            except Exception as e:
                failed_files.append({
                    "file": rel_path,
                    "error": str(e)
                })

    # Save mapping file
    os.makedirs(os.path.dirname(mapping_path), exist_ok=True)
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2)

    total_std = len(mapping)
    print(f"[STANDARDIZE] Successfully converted & standardized {total_std} audio files.", flush=True)
    if failed_files:
        print(f"[STANDARDIZE] Failed files ({len(failed_files)}):", flush=True)
        for fail in failed_files:
            print(f"  - {fail['file']}: {fail['error']}", flush=True)

    return {
        "total_standardized": total_std,
        "failed_count": len(failed_files),
        "failed_files": failed_files,
        "counters": counters,
        "mapping_path": mapping_path
    }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Standardize TRINETRA audio files")
    parser.add_argument("--raw-dir", type=str, default="TRINETRA_ML/raw", help="Path to raw dataset")
    parser.add_argument("--std-dir", type=str, default="TRINETRA_ML/standardized", help="Path to output standardized dataset")
    parser.add_argument("--mapping", type=str, default="TRINETRA_ML/metadata/standardization_mapping.json", help="Path to output mapping json")
    args = parser.parse_args()

    standardize_dataset(args.raw_dir, args.std_dir, args.mapping)
