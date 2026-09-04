#!/usr/bin/env python3
"""
TRINETRA ML - Quality Control Script
Performs quality verification on standardized WAV files:
- Checks sample rate == 16000, mono, 16-bit PCM
- Checks readability, non-zero duration, RMS, Peak, and silence ratio
- Categorizes status into OK, WARNING, REJECTED
- Moves REJECTED files to TRINETRA_ML/rejected/
- Generates reports/quality_report.csv
"""

import os
import shutil
import csv
from pathlib import Path
from typing import Dict, Any, List
import numpy as np
import soundfile as sf

def compute_silence_ratio(audio_data: np.ndarray, threshold: float = 0.01) -> float:
    if audio_data.size == 0:
        return 1.0
    silent_samples = np.sum(np.abs(audio_data) < threshold)
    return float(silent_samples) / float(audio_data.size)

def evaluate_audio_quality(filepath: str, label: str) -> Dict[str, Any]:
    res = {
        "file": filepath.replace("\\", "/"),
        "label": label,
        "duration": 0.0,
        "sample_rate": 0,
        "channels": 0,
        "bit_depth": 0,
        "rms": 0.0,
        "peak": 0.0,
        "silence_ratio": 1.0,
        "status": "OK",
        "reason": "Passed all quality checks"
    }

    try:
        with sf.SoundFile(filepath) as f:
            res["sample_rate"] = f.samplerate
            res["channels"] = f.channels
            res["duration"] = float(len(f)) / float(f.samplerate) if f.samplerate else 0.0
            subtype = f.subtype
            if "PCM_16" in subtype or "16" in subtype:
                res["bit_depth"] = 16
            else:
                res["bit_depth"] = subtype

        data, sr = sf.read(filepath, dtype='float32')
        if data.size == 0 or res["duration"] <= 0.0:
            res["status"] = "REJECTED"
            res["reason"] = "Zero duration or empty audio array"
            return res

        peak = float(np.max(np.abs(data)))
        rms = float(np.sqrt(np.mean(data**2)))
        silence_ratio = compute_silence_ratio(data)

        res["peak"] = round(peak, 5)
        res["rms"] = round(rms, 5)
        res["silence_ratio"] = round(silence_ratio, 4)

        # Verification rules
        if res["sample_rate"] != 16000 or res["channels"] != 1 or res["bit_depth"] != 16:
            res["status"] = "REJECTED"
            res["reason"] = f"Format mismatch: sr={res['sample_rate']}, ch={res['channels']}, bd={res['bit_depth']}"
            return res

        # True silence / dead audio rejection
        if peak < 1e-4 and rms < 1e-4:
            res["status"] = "REJECTED"
            res["reason"] = f"Completely silent audio (RMS={rms:.6f}, Peak={peak:.6f})"
            return res

        # Warnings for quiet or extreme audio
        warnings = []
        if res["duration"] < 0.3:
            warnings.append(f"Short duration ({res['duration']:.2f}s < 0.3s)")
        elif res["duration"] > 10.0:
            warnings.append(f"Long duration ({res['duration']:.2f}s > 10.0s)")
        
        if rms < 0.005:
            warnings.append(f"Low signal RMS ({rms:.5f})")
        
        if silence_ratio > 0.95:
            warnings.append(f"High silence ratio ({silence_ratio:.2f})")

        if peak >= 0.999:
            warnings.append("Near peak saturation / possible clipping")

        if warnings:
            res["status"] = "WARNING"
            res["reason"] = "; ".join(warnings)

    except Exception as e:
        res["status"] = "REJECTED"
        res["reason"] = f"Unreadable / corrupted WAV file: {str(e)}"

    return res

def run_quality_check(standardized_dir: str, rejected_dir: str, output_csv: str) -> Dict[str, Any]:
    std_path = Path(standardized_dir)
    rej_path = Path(rejected_dir)
    rej_path.mkdir(parents=True, exist_ok=True)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    all_wavs = []
    for root, _, files in os.walk(std_path):
        for f in files:
            if f.lower().endswith(".wav"):
                all_wavs.append(os.path.join(root, f))

    print(f"[QUALITY] Inspecting {len(all_wavs)} standardized audio files...")

    records = []
    status_counts = {"OK": 0, "WARNING": 0, "REJECTED": 0}
    rejected_files_moved = []

    for wav_file in sorted(all_wavs):
        rel = os.path.relpath(wav_file, std_path).replace("\\", "/")
        label = rel.split("/")[0] if "/" in rel else "unknown"

        result = evaluate_audio_quality(wav_file, label)
        status = result["status"]
        status_counts[status] += 1

        if status == "REJECTED":
            # Move rejected file to rejected_dir maintaining relative path structure
            dest_file = rej_path / rel
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(wav_file, dest_file)
            rejected_files_moved.append({
                "original_standardized": wav_file,
                "moved_to": str(dest_file),
                "reason": result["reason"]
            })
            result["file"] = str(dest_file).replace("\\", "/")

        records.append(result)

    # Write CSV report
    fieldnames = ["file", "label", "duration", "sample_rate", "channels", "bit_depth", "rms", "peak", "silence_ratio", "status", "reason"]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"[QUALITY] Quality check complete:\n  - OK:       {status_counts['OK']}\n  - WARNING:  {status_counts['WARNING']}\n  - REJECTED: {status_counts['REJECTED']}")
    print(f"[QUALITY] Report saved to: {output_csv}")

    return {
        "status_counts": status_counts,
        "rejected_moved": rejected_files_moved,
        "total_checked": len(records)
    }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run quality checks on standardized audio")
    parser.add_argument("--std-dir", type=str, default="TRINETRA_ML/standardized", help="Standardized directory")
    parser.add_argument("--rej-dir", type=str, default="TRINETRA_ML/rejected", help="Rejected directory")
    parser.add_argument("--out-csv", type=str, default="TRINETRA_ML/reports/quality_report.csv", help="Output CSV path")
    args = parser.parse_args()

    run_quality_check(args.std_dir, args.rej_dir, args.out_csv)
