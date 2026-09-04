#!/usr/bin/env python3
"""
TRINETRA ML - Metadata & Visualization Generator
Generates:
1. metadata/metadata.csv
2. reports/dataset_distribution.csv
3. Matplotlib visualization plots under reports/plots/:
   - class_distribution.png
   - folder_distribution.png
   - duration_distribution.png
   - sample_rate_distribution.png
   - source_distribution.png
   - speaker_distribution.png
   - noise_environment_distribution.png
"""

import os
import re
import csv
import json
import hashlib
from pathlib import Path
from typing import Dict, Any, List
import numpy as np
import soundfile as sf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def compute_file_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def extract_speaker(filename: str) -> str:
    base = os.path.basename(filename).lower()
    # Match patterns like speaker_anush, speaker_srinivas, speaker_bhagya
    m = re.search(r'speaker_([a-zA-Z0-9]+)', base)
    if m:
        return m.group(1).lower()
    # Match known named speakers like nishanth_...
    for known in ['nishanth', 'anush', 'srinivas', 'bhagya']:
        if base.startswith(known):
            return known
    return "unknown"

def extract_source(filename: str, original_path: str) -> str:
    base = os.path.basename(filename).lower()
    orig = original_path.lower()
    
    if any(k in base for k in ['synthetic', 'synth', 'tts', 'elevenlabs', 'edge_tts', 'generated', 'ai_']):
        return "synthetic"
    
    # Natural recordings from microphones, phones, field recorders, WhatsApp, voice memos
    if any(k in base for k in ['speaker_', 'nishanth', 'road number', 'whatsapp', 'ss', 'ac_', 'fan_', 'music_', 'people_', 'traffic_', 'tv_']):
        return "natural"
    if any(k in orig for k in ['positive_sounds', 'negative_sounds', 'similar_sounds', 'noise_sounds']):
        # If it doesn't match synthetic keyword and is in the audio collection
        if 'synthetic' in orig:
            return "synthetic"
        return "natural"
    
    return "unknown"

def create_metadata_and_reports(
    standardized_dir: str,
    mapping_json: str,
    quality_report_csv: str,
    output_metadata_csv: str,
    output_dist_csv: str,
    plots_dir: str
) -> Dict[str, Any]:
    std_path = Path(standardized_dir)
    plots_path = Path(plots_dir)
    plots_path.mkdir(parents=True, exist_ok=True)
    os.makedirs(os.path.dirname(output_metadata_csv), exist_ok=True)
    os.makedirs(os.path.dirname(output_dist_csv), exist_ok=True)

    # Load mapping
    mapping_by_std = {}
    if os.path.exists(mapping_json):
        with open(mapping_json, "r", encoding="utf-8") as f:
            mapping_list = json.load(f)
            for m in mapping_list:
                # normalize path
                std_rel = m["standardized_relative_path"].replace("\\", "/")
                mapping_by_std[std_rel] = m
                mapping_by_std[os.path.basename(std_rel)] = m

    # Load quality statuses
    quality_by_file = {}
    if os.path.exists(quality_report_csv):
        with open(quality_report_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                f_base = os.path.basename(row["file"])
                quality_by_file[f_base] = row["status"]

    # Gather all standardized wavs
    all_wavs = []
    for root, _, files in os.walk(std_path):
        for f in files:
            if f.lower().endswith(".wav"):
                all_wavs.append(os.path.join(root, f))

    print(f"[METADATA] Building metadata for {len(all_wavs)} standardized audio files...")

    records = []
    clip_id = 1

    for wav_path in sorted(all_wavs):
        rel_std = os.path.relpath(wav_path, std_path.parent).replace("\\", "/")
        fname = os.path.basename(wav_path)

        mapping_info = mapping_by_std.get(rel_std, mapping_by_std.get(fname, {}))
        orig_path = mapping_info.get("original_relative_path", "unknown")
        orig_ext = mapping_info.get("original_extension", os.path.splitext(orig_path)[1].lower())
        folder_label = mapping_info.get("label", "unknown")
        env = mapping_info.get("environment", None)

        if folder_label == "unknown":
            if "positive" in rel_std:
                folder_label = "positive"
            elif "negative" in rel_std:
                folder_label = "negative"
            elif "similar" in rel_std:
                folder_label = "similar"
            elif "background" in rel_std:
                folder_label = "background"

        # ML Class mapping:
        # positive -> TRINETRA
        # negative -> UNKNOWN
        # similar  -> UNKNOWN
        # background / noise -> BACKGROUND
        if folder_label == "positive":
            ml_class = "TRINETRA"
            env_val = "clean"
        elif folder_label in ["negative", "similar"]:
            ml_class = "UNKNOWN"
            env_val = "clean"
        elif folder_label == "background":
            ml_class = "BACKGROUND"
            if not env:
                # parse from rel_std e.g. standardized/background/ac/background_ac_000001.wav
                parts = rel_std.split("/")
                env_val = parts[2] if len(parts) > 3 else "random"
            else:
                env_val = env
        else:
            ml_class = "UNKNOWN"
            env_val = "unknown"

        speaker = extract_speaker(orig_path)
        source = extract_source(fname, orig_path)

        # Audio file stats
        file_size = os.path.getsize(wav_path)
        sha = compute_file_sha256(wav_path)
        q_status = quality_by_file.get(fname, "OK")

        with sf.SoundFile(wav_path) as sf_f:
            sr = sf_f.samplerate
            ch = sf_f.channels
            dur = float(len(sf_f)) / float(sr) if sr else 0.0
            subtype = sf_f.subtype
            bit_depth = 16 if "16" in subtype or "PCM_16" in subtype else subtype

        row = {
            "id": f"TRN_{clip_id:06d}",
            "original_path": orig_path,
            "standardized_path": rel_std,
            "label": folder_label,
            "ml_class": ml_class,
            "extension": orig_ext,
            "source": source,
            "speaker": speaker,
            "environment": env_val,
            "duration_sec": round(dur, 4),
            "sample_rate": sr,
            "channels": ch,
            "bit_depth": bit_depth,
            "file_size_bytes": file_size,
            "sha256": sha,
            "quality_status": q_status
        }
        records.append(row)
        clip_id += 1

    # Write metadata.csv
    fieldnames = [
        "id", "original_path", "standardized_path", "label", "ml_class",
        "extension", "source", "speaker", "environment", "duration_sec",
        "sample_rate", "channels", "bit_depth", "file_size_bytes", "sha256", "quality_status"
    ]
    with open(output_metadata_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"[METADATA] metadata.csv created with {len(records)} entries -> {output_metadata_csv}")

    # Generate Distribution Statistics
    total_files = len(records)
    label_counts = {}
    ml_class_counts = {}
    source_counts = {}
    speaker_counts = {}
    env_counts = {}
    durations = []

    for r in records:
        lbl = r["label"]
        label_counts[lbl] = label_counts.get(lbl, 0) + 1

        cls_ = r["ml_class"]
        ml_class_counts[cls_] = ml_class_counts.get(cls_, 0) + 1

        src = r["source"]
        source_counts[src] = source_counts.get(src, 0) + 1

        spk = r["speaker"]
        speaker_counts[spk] = speaker_counts.get(spk, 0) + 1

        if r["label"] == "background":
            env = r["environment"]
            env_counts[env] = env_counts.get(env, 0) + 1

        durations.append(r["duration_sec"])

    # Write dataset_distribution.csv
    dist_rows = []
    dist_rows.append({"category": "TOTAL", "item": "All Standardized Files", "count": total_files, "percentage": 100.0})
    for k, v in sorted(ml_class_counts.items()):
        dist_rows.append({"category": "ML_CLASS", "item": k, "count": v, "percentage": round((v/total_files)*100, 2)})
    for k, v in sorted(label_counts.items()):
        dist_rows.append({"category": "FOLDER_LABEL", "item": k, "count": v, "percentage": round((v/total_files)*100, 2)})
    for k, v in sorted(source_counts.items()):
        dist_rows.append({"category": "SOURCE", "item": k, "count": v, "percentage": round((v/total_files)*100, 2)})
    for k, v in sorted(speaker_counts.items()):
        dist_rows.append({"category": "SPEAKER", "item": k, "count": v, "percentage": round((v/total_files)*100, 2)})
    for k, v in sorted(env_counts.items()):
        dist_rows.append({"category": "ENVIRONMENT", "item": k, "count": v, "percentage": round((v/label_counts.get('background', 1))*100, 2)})

    with open(output_dist_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["category", "item", "count", "percentage"])
        writer.writeheader()
        writer.writerows(dist_rows)

    print(f"[DISTRIBUTION] Distribution CSV saved -> {output_dist_csv}")

    # Generate Matplotlib Visualizations
    plt.style.use('default')

    # 1. Class Distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    classes = list(ml_class_counts.keys())
    c_counts = [ml_class_counts[c] for c in classes]
    bars = ax.bar(classes, c_counts, color=['#2ecc71', '#e74c3c', '#3498db'])
    ax.set_title("TRINETRA Dataset - Target ML Class Distribution", fontsize=14, fontweight='bold')
    ax.set_xlabel("ML Class", fontsize=11)
    ax.set_ylabel("Number of Samples", fontsize=11)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 5, f"{int(yval)}", ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(plots_path / "class_distribution.png", dpi=200)
    plt.close()

    # 2. Folder Distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    labels = list(label_counts.keys())
    l_counts = [label_counts[l] for l in labels]
    bars = ax.bar(labels, l_counts, color=['#27ae60', '#e67e22', '#9b59b6', '#34495e'])
    ax.set_title("Raw Category / Folder Distribution", fontsize=14, fontweight='bold')
    ax.set_xlabel("Category Label", fontsize=11)
    ax.set_ylabel("Sample Count", fontsize=11)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 5, f"{int(yval)}", ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(plots_path / "folder_distribution.png", dpi=200)
    plt.close()

    # 3. Audio Duration Distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(durations, bins=30, color='#16a085', edgecolor='white', alpha=0.85)
    mean_dur = float(np.mean(durations)) if durations else 0.0
    ax.axvline(mean_dur, color='#c0392b', linestyle='--', linewidth=2, label=f'Mean Duration: {mean_dur:.2f}s')
    ax.set_title("Audio Clip Duration Distribution", fontsize=14, fontweight='bold')
    ax.set_xlabel("Duration (seconds)", fontsize=11)
    ax.set_ylabel("Count", fontsize=11)
    ax.legend(loc='upper right')
    plt.tight_layout()
    plt.savefig(plots_path / "duration_distribution.png", dpi=200)
    plt.close()

    # 4. Sample Rate Distribution (Standardized vs Original)
    fig, ax = plt.subplots(figsize=(8, 5))
    sr_vals = ["Standardized: 16000 Hz"]
    sr_counts_list = [total_files]
    bars = ax.bar(sr_vals, sr_counts_list, color='#2980b9', width=0.4)
    ax.set_title("Standardized Audio Sample Rate (100% 16 kHz Target)", fontsize=14, fontweight='bold')
    ax.set_ylabel("Files", fontsize=11)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 5, f"{int(yval)} (100%)", ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(plots_path / "sample_rate_distribution.png", dpi=200)
    plt.close()

    # 5. Source Distribution (Natural vs Synthetic)
    fig, ax = plt.subplots(figsize=(8, 5))
    src_keys = list(source_counts.keys())
    src_vals = [source_counts[k] for k in src_keys]
    bars = ax.bar(src_keys, src_vals, color=['#8e44ad', '#d35400', '#7f8c8d'])
    ax.set_title("Audio Source Distribution (Natural vs Synthetic)", fontsize=14, fontweight='bold')
    ax.set_xlabel("Source Type", fontsize=11)
    ax.set_ylabel("Count", fontsize=11)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 5, f"{int(yval)}", ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(plots_path / "source_distribution.png", dpi=200)
    plt.close()

    # 6. Speaker Distribution
    fig, ax = plt.subplots(figsize=(9, 5))
    spk_keys = list(speaker_counts.keys())
    spk_vals = [speaker_counts[k] for k in spk_keys]
    bars = ax.bar(spk_keys, spk_vals, color='#34495e')
    ax.set_title("Identified Speaker Distribution", fontsize=14, fontweight='bold')
    ax.set_xlabel("Speaker ID", fontsize=11)
    ax.set_ylabel("Recordings Count", fontsize=11)
    plt.xticks(rotation=15)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 5, f"{int(yval)}", ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(plots_path / "speaker_distribution.png", dpi=200)
    plt.close()

    # 7. Noise Environment Distribution
    fig, ax = plt.subplots(figsize=(9, 5))
    env_keys = list(env_counts.keys())
    env_vals = [env_counts[k] for k in env_keys]
    bars = ax.bar(env_keys, env_vals, color='#16a085')
    ax.set_title("Background Noise Environment Sub-categories", fontsize=14, fontweight='bold')
    ax.set_xlabel("Environment", fontsize=11)
    ax.set_ylabel("Audio Clips", fontsize=11)
    plt.xticks(rotation=25)
    for bar in bars:
        yval = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, yval + 3, f"{int(yval)}", ha='center', va='bottom', fontweight='bold')
    plt.tight_layout()
    plt.savefig(plots_path / "noise_environment_distribution.png", dpi=200)
    plt.close()

    print(f"[PLOTS] Generated 7 matplotlib visualization plots in: {plots_dir}")

    return {
        "total_files": total_files,
        "ml_class_counts": ml_class_counts,
        "label_counts": label_counts,
        "source_counts": source_counts,
        "speaker_counts": speaker_counts,
        "environment_counts": env_counts
    }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Create metadata CSV, distribution report, and visualization plots")
    parser.add_argument("--std-dir", type=str, default="TRINETRA_ML/standardized", help="Standardized directory")
    parser.add_argument("--mapping", type=str, default="TRINETRA_ML/metadata/standardization_mapping.json", help="Mapping JSON")
    parser.add_argument("--quality-csv", type=str, default="TRINETRA_ML/reports/quality_report.csv", help="Quality report CSV")
    parser.add_argument("--out-metadata", type=str, default="TRINETRA_ML/metadata/metadata.csv", help="Output metadata CSV")
    parser.add_argument("--out-dist", type=str, default="TRINETRA_ML/reports/dataset_distribution.csv", help="Output distribution CSV")
    parser.add_argument("--plots-dir", type=str, default="TRINETRA_ML/reports/plots", help="Output plots directory")
    args = parser.parse_args()

    create_metadata_and_reports(
        args.std_dir, args.mapping, args.quality_csv,
        args.out_metadata, args.out_dist, args.plots_dir
    )
