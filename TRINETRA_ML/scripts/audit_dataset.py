#!/usr/bin/env python3
"""
TRINETRA ML - Dataset Audit Script
Recursively scans the raw dataset, inspects every media file (WAV, M4A, MP4, etc.),
checks duration, sample rate, channels, bit depth, codec, silence, corruption,
and outputs a comprehensive audit report (TXT and JSON).
"""

import os
import sys
import json
import wave
import hashlib
from pathlib import Path
from typing import Dict, Any, List
import numpy as np
import soundfile as sf
import av

def compute_file_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()

def read_audio_info(filepath: str) -> Dict[str, Any]:
    ext = os.path.splitext(filepath)[1].lower()
    file_size = os.path.getsize(filepath)
    
    info = {
        "filepath": filepath,
        "filename": os.path.basename(filepath),
        "extension": ext,
        "file_size_bytes": file_size,
        "sample_rate": None,
        "channels": None,
        "duration_sec": 0.0,
        "bit_depth": None,
        "codec": None,
        "readable": False,
        "corrupted": False,
        "zero_length": file_size == 0,
        "silent": False,
        "rms": 0.0,
        "peak": 0.0,
        "error": None
    }
    
    if file_size == 0:
        info["corrupted"] = True
        info["error"] = "Zero byte file"
        return info

    try:
        if ext == ".wav":
            # Attempt with soundfile first
            try:
                with sf.SoundFile(filepath) as f:
                    info["sample_rate"] = f.samplerate
                    info["channels"] = f.channels
                    info["duration_sec"] = float(len(f)) / float(f.samplerate) if f.samplerate else 0.0
                    info["codec"] = f.format
                    subtype = f.subtype
                    if "PCM_16" in subtype or "16" in subtype:
                        info["bit_depth"] = 16
                    elif "PCM_24" in subtype or "24" in subtype:
                        info["bit_depth"] = 24
                    elif "PCM_32" in subtype or "32" in subtype:
                        info["bit_depth"] = 32
                    elif "PCM_U8" in subtype or "8" in subtype:
                        info["bit_depth"] = 8
                    else:
                        info["bit_depth"] = subtype
                
                # Check audio contents (rms/peak/silence)
                data, _ = sf.read(filepath, dtype='float32')
                info["readable"] = True
                if data.size > 0:
                    info["peak"] = float(np.max(np.abs(data)))
                    info["rms"] = float(np.sqrt(np.mean(data**2)))
                    if info["peak"] < 1e-4 or info["rms"] < 1e-4:
                        info["silent"] = True
            except Exception as sf_err:
                # Fallback to wave module or PyAV
                try:
                    container = av.open(filepath)
                    audio_streams = [s for s in container.streams if s.type == 'audio']
                    if not audio_streams:
                        raise ValueError("No audio stream found")
                    stream = audio_streams[0]
                    info["sample_rate"] = stream.codec_context.sample_rate
                    info["channels"] = stream.codec_context.channels
                    info["codec"] = stream.codec_context.name
                    info["bit_depth"] = stream.codec_context.format.bits if hasattr(stream.codec_context.format, 'bits') else 16
                    frames = []
                    for frame in container.decode(stream):
                        frames.append(frame.to_ndarray())
                    container.close()
                    if frames:
                        arr = np.concatenate(frames, axis=-1)
                        if arr.ndim > 1:
                            info["duration_sec"] = arr.shape[1] / float(info["sample_rate"])
                        else:
                            info["duration_sec"] = arr.shape[0] / float(info["sample_rate"])
                        info["readable"] = True
                except Exception as e:
                    info["corrupted"] = True
                    info["error"] = f"WAV read error: {sf_err} / {e}"

        elif ext in [".m4a", ".mp4", ".aac", ".ogg", ".flac", ".mp3"]:
            try:
                container = av.open(filepath)
                audio_streams = [s for s in container.streams if s.type == 'audio']
                if not audio_streams:
                    info["corrupted"] = True
                    info["error"] = "No audio stream found in container"
                else:
                    stream = audio_streams[0]
                    info["sample_rate"] = stream.codec_context.sample_rate or stream.rate
                    info["channels"] = stream.codec_context.channels or stream.channels
                    info["codec"] = stream.codec_context.name
                    info["bit_depth"] = getattr(stream.codec_context.format, 'bits', 16) if stream.codec_context.format else 16
                    
                    # Read audio frames to calculate duration and signal stats
                    frames = []
                    for frame in container.decode(stream):
                        # convert to float ndarray
                        plane = frame.to_ndarray()
                        frames.append(plane)
                    container.close()
                    
                    if frames:
                        audio_data = np.concatenate(frames, axis=-1).astype(np.float32)
                        # Normalize according to dtype if integer
                        if np.issubdtype(frames[0].dtype, np.integer):
                            max_val = float(np.iinfo(frames[0].dtype).max)
                            audio_data /= max_val
                        
                        total_samples = audio_data.shape[-1]
                        if info["sample_rate"] and info["sample_rate"] > 0:
                            info["duration_sec"] = total_samples / float(info["sample_rate"])
                        info["readable"] = True
                        info["peak"] = float(np.max(np.abs(audio_data)))
                        info["rms"] = float(np.sqrt(np.mean(audio_data**2)))
                        if info["peak"] < 1e-4 or info["rms"] < 1e-4:
                            info["silent"] = True
                    else:
                        info["corrupted"] = True
                        info["error"] = "Empty audio stream"
            except Exception as av_err:
                info["corrupted"] = True
                info["error"] = f"Decoding error: {av_err}"
        else:
            info["corrupted"] = True
            info["error"] = f"Unsupported file extension: {ext}"

    except Exception as general_err:
        info["corrupted"] = True
        info["error"] = str(general_err)

    return info


def run_audit(raw_dataset_dir: str, output_report_txt: str, output_report_json: str) -> Dict[str, Any]:
    raw_path = Path(raw_dataset_dir)
    if not raw_path.exists():
        raise FileNotFoundError(f"Raw dataset directory '{raw_dataset_dir}' does not exist.")

    all_files = []
    for root, dirs, files in os.walk(raw_path):
        for f in files:
            all_files.append(os.path.join(root, f))

    print(f"[AUDIT] Scanning {len(all_files)} total files in {raw_dataset_dir}...")
    
    file_audits = []
    folder_counts = {}
    ext_counts = {}
    sr_counts = {}
    channel_counts = {}
    bit_depth_counts = {}
    codec_counts = {}
    
    corrupted_files = []
    zero_len_files = []
    silent_files = []
    very_short_files = [] # < 0.3 sec
    unusually_long_files = [] # > 10.0 sec
    
    sha256_map = {}
    duplicates = []
    
    durations = []

    for fpath in all_files:
        rel = os.path.relpath(fpath, raw_dataset_dir).replace("\\", "/")
        parts = rel.split("/")
        if parts and parts[0].lower() in ["audio-clips", "audio_clips", "raw"]:
            parts = parts[1:]
        top_folder = parts[0] if parts else "root"
        folder_counts[top_folder] = folder_counts.get(top_folder, 0) + 1
        
        info = read_audio_info(fpath)
        info["relative_path"] = rel
        info["top_folder"] = top_folder
        
        ext = info["extension"]
        ext_counts[ext] = ext_counts.get(ext, 0) + 1
        
        # SHA256 for exact duplicate check
        file_hash = compute_file_sha256(fpath)
        info["sha256"] = file_hash
        if file_hash in sha256_map:
            duplicates.append({"original": sha256_map[file_hash], "duplicate": rel, "hash": file_hash})
        else:
            sha256_map[file_hash] = rel

        if info["corrupted"]:
            corrupted_files.append(rel)
        if info["zero_length"]:
            zero_len_files.append(rel)
        if info["silent"]:
            silent_files.append(rel)
            
        dur = info["duration_sec"]
        if info["readable"]:
            durations.append(dur)
            if dur < 0.3:
                very_short_files.append({"file": rel, "duration": dur})
            if dur > 10.0:
                unusually_long_files.append({"file": rel, "duration": dur})

            sr = str(info["sample_rate"])
            sr_counts[sr] = sr_counts.get(sr, 0) + 1

            ch = str(info["channels"])
            channel_counts[ch] = channel_counts.get(ch, 0) + 1

            bd = str(info["bit_depth"])
            bit_depth_counts[bd] = bit_depth_counts.get(bd, 0) + 1

            cd = str(info["codec"])
            codec_counts[cd] = codec_counts.get(cd, 0) + 1

        file_audits.append(info)

    avg_dur = float(np.mean(durations)) if durations else 0.0
    min_dur = float(np.min(durations)) if durations else 0.0
    max_dur = float(np.max(durations)) if durations else 0.0
    total_dur_hours = float(np.sum(durations)) / 3600.0 if durations else 0.0

    report_data = {
        "total_files": len(all_files),
        "total_readable_files": len(durations),
        "folder_distribution": folder_counts,
        "extension_distribution": ext_counts,
        "sample_rate_distribution": sr_counts,
        "channel_distribution": channel_counts,
        "bit_depth_distribution": bit_depth_counts,
        "codec_distribution": codec_counts,
        "duration_metrics": {
            "min_sec": round(min_dur, 3),
            "max_sec": round(max_dur, 3),
            "mean_sec": round(avg_dur, 3),
            "total_hours": round(total_dur_hours, 3)
        },
        "anomalies": {
            "corrupted_count": len(corrupted_files),
            "corrupted_files": corrupted_files,
            "zero_length_count": len(zero_len_files),
            "zero_length_files": zero_len_files,
            "silent_count": len(silent_files),
            "silent_files": silent_files,
            "very_short_count (<0.3s)": len(very_short_files),
            "very_short_files": very_short_files,
            "unusually_long_count (>10s)": len(unusually_long_files),
            "unusually_long_files": unusually_long_files,
            "exact_duplicate_files_count": len(duplicates),
            "exact_duplicates": duplicates
        }
    }

    # Save JSON report
    os.makedirs(os.path.dirname(output_report_json), exist_ok=True)
    with open(output_report_json, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    # Generate Human Readable TXT Report
    txt_lines = [
        "=" * 60,
        "TRINETRA DATASET AUDIT REPORT",
        "=" * 60,
        f"Total media files scanned: {report_data['total_files']}",
        f"Successfully decoded files: {report_data['total_readable_files']}",
        f"Total audio duration: {report_data['duration_metrics']['total_hours']} hours",
        f"Audio duration range: {report_data['duration_metrics']['min_sec']}s - {report_data['duration_metrics']['max_sec']}s (Mean: {report_data['duration_metrics']['mean_sec']}s)",
        "-" * 60,
        "FOLDER DISTRIBUTION:",
    ]
    for k, v in sorted(folder_counts.items()):
        txt_lines.append(f"  - {k}: {v} files")

    txt_lines.extend([
        "-" * 60,
        "EXTENSION DISTRIBUTION:",
    ])
    for k, v in sorted(ext_counts.items()):
        txt_lines.append(f"  - {k}: {v} files")

    txt_lines.extend([
        "-" * 60,
        "SAMPLE RATE DISTRIBUTION (Readable):",
    ])
    for k, v in sorted(sr_counts.items()):
        txt_lines.append(f"  - {k} Hz: {v} files")

    txt_lines.extend([
        "-" * 60,
        "CHANNELS DISTRIBUTION (Readable):",
    ])
    for k, v in sorted(channel_counts.items()):
        txt_lines.append(f"  - {k} channel(s): {v} files")

    txt_lines.extend([
        "-" * 60,
        "BIT DEPTH DISTRIBUTION (Readable):",
    ])
    for k, v in sorted(bit_depth_counts.items()):
        txt_lines.append(f"  - {k} bit: {v} files")

    txt_lines.extend([
        "-" * 60,
        "CODEC / CONTAINER DISTRIBUTION:",
    ])
    for k, v in sorted(codec_counts.items()):
        txt_lines.append(f"  - {k}: {v} files")

    txt_lines.extend([
        "-" * 60,
        "QUALITY & ANOMALY AUDIT:",
        f"  - Corrupted / Unreadable: {len(corrupted_files)}",
        f"  - Zero-Length files:      {len(zero_len_files)}",
        f"  - Silent files:           {len(silent_files)}",
        f"  - Very short (<0.3s):     {len(very_short_files)}",
        f"  - Unusually long (>10s):  {len(unusually_long_files)}",
        f"  - Exact Duplicate files:  {len(duplicates)}",
        "=" * 60,
    ])

    report_txt_content = "\n".join(txt_lines)
    os.makedirs(os.path.dirname(output_report_txt), exist_ok=True)
    with open(output_report_txt, "w", encoding="utf-8") as f:
        f.write(report_txt_content)

    print(report_txt_content)
    print(f"\n[AUDIT] Reports saved to:\n  TXT:  {output_report_txt}\n  JSON: {output_report_json}\n")

    return report_data

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Audit TRINETRA raw dataset")
    parser.add_argument("--raw-dir", type=str, default="TRINETRA_ML/raw", help="Path to raw dataset directory")
    parser.add_argument("--out-txt", type=str, default="TRINETRA_ML/reports/dataset_audit.txt", help="Output text report")
    parser.add_argument("--out-json", type=str, default="TRINETRA_ML/reports/dataset_audit.json", help="Output json report")
    args = parser.parse_args()

    run_audit(args.raw_dir, args.out_txt, args.out_json)
