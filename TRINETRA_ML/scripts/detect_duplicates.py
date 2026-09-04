#!/usr/bin/env python3
"""
TRINETRA ML - Duplicate Detection Script
Detects:
1. EXACT_FILE: Cryptographic file hash (SHA-256) matches
2. SAME_AUDIO_CONTENT: Audio waveform content matches even across different containers/names

Generates reports/duplicates.csv
"""

import os
import csv
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Tuple
import numpy as np
import soundfile as sf

def compute_file_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def compute_audio_waveform_hash(filepath: str) -> str:
    """
    Computes a deterministic hash of the decoded audio waveform data.
    Quantizes to standard int16 representation to be robust against minor container differences.
    """
    try:
        data, sr = sf.read(filepath, dtype='int16')
        # Hash the raw sample bytes
        sha = hashlib.sha256()
        sha.update(data.tobytes())
        return sha.hexdigest()
    except Exception:
        return ""

def detect_all_duplicates(raw_dir: str, standardized_dir: str, output_csv: str) -> List[Dict[str, Any]]:
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    
    raw_path = Path(raw_dir)
    std_path = Path(standardized_dir)
    
    duplicates_record = []
    
    # 1. Exact raw file duplicates
    raw_hash_map = {}
    if raw_path.exists():
        for root, _, files in os.walk(raw_path):
            for f in sorted(files):
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, raw_path).replace("\\", "/")
                file_hash = compute_file_sha256(full_path)
                if file_hash in raw_hash_map:
                    duplicates_record.append({
                        "original_file": rel_path,
                        "duplicate_of": raw_hash_map[file_hash],
                        "hash": file_hash,
                        "duplicate_type": "EXACT_FILE"
                    })
                else:
                    raw_hash_map[file_hash] = rel_path

    # 2. Standardized waveform content duplicates
    std_hash_map = {}
    std_wav_files = []
    if std_path.exists():
        for root, _, files in os.walk(std_path):
            for f in sorted(files):
                if f.lower().endswith(".wav"):
                    std_wav_files.append(os.path.join(root, f))
                    
        for wav_file in sorted(std_wav_files):
            rel_std = os.path.relpath(wav_file, std_path.parent).replace("\\", "/")
            audio_hash = compute_audio_waveform_hash(wav_file)
            if not audio_hash:
                continue
                
            if audio_hash in std_hash_map:
                # Check if not already recorded under EXACT_FILE
                existing_original = std_hash_map[audio_hash]
                duplicates_record.append({
                    "original_file": rel_std,
                    "duplicate_of": existing_original,
                    "hash": audio_hash,
                    "duplicate_type": "SAME_AUDIO_CONTENT"
                })
            else:
                std_hash_map[audio_hash] = rel_std

    # Write duplicates CSV
    fieldnames = ["original_file", "duplicate_of", "hash", "duplicate_type"]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(duplicates_record)

    exact_count = sum(1 for d in duplicates_record if d["duplicate_type"] == "EXACT_FILE")
    content_count = sum(1 for d in duplicates_record if d["duplicate_type"] == "SAME_AUDIO_CONTENT")

    print(f"[DUPLICATES] Duplicate scan complete:")
    print(f"  - EXACT_FILE duplicates:        {exact_count}")
    print(f"  - SAME_AUDIO_CONTENT duplicates: {content_count}")
    print(f"  - Total duplicate entries:      {len(duplicates_record)}")
    print(f"[DUPLICATES] Report saved to: {output_csv}")

    return duplicates_record

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Detect exact and content duplicates")
    parser.add_argument("--raw-dir", type=str, default="TRINETRA_ML/raw", help="Raw directory")
    parser.add_argument("--std-dir", type=str, default="TRINETRA_ML/standardized", help="Standardized directory")
    parser.add_argument("--out-csv", type=str, default="TRINETRA_ML/reports/duplicates.csv", help="Output duplicates CSV")
    args = parser.parse_args()

    detect_all_duplicates(args.raw_dir, args.std_dir, args.out_csv)
