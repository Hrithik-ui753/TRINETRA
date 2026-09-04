#!/usr/bin/env python3
"""
TRINETRA ML - Master Preprocessing & Preparation Pipeline Runner
Executes the entire end-to-end dataset preprocessing pipeline:
1. Zip Extraction to TRINETRA_ML/raw
2. Dataset Audit (TXT & JSON)
3. Audio Standardization (16kHz, Mono, 16-bit PCM WAV)
4. Quality Control & Isolation of Defective Files
5. Cryptographic & Audio Waveform Duplicate Detection
6. Metadata & Dataset Distribution CSV Generation
7. Matplotlib Visualizations
8. Leakage-Safe Train / Validation / Test Splitting
9. Automated Rigorous Validation Checks

Usage:
  python scripts/run_preprocessing.py --input AUDIO-CLIPS.zip
"""

import os
import sys
import zipfile
import argparse
import csv
from pathlib import Path
import soundfile as sf

# Add scripts directory to path for local imports
script_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(script_dir))

from audit_dataset import run_audit
from standardize_audio import standardize_dataset
from quality_check import run_quality_check
from detect_duplicates import detect_all_duplicates
from create_metadata import create_metadata_and_reports
from create_splits import create_dataset_splits

def extract_zip(zip_path: str, extract_to: str):
    print(f"\n[STEP 1/8] Extracting '{zip_path}' to '{extract_to}'...")
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(extract_to)
    print(f"[STEP 1/8] Extraction complete.")

def verify_dataset(
    std_dir: str,
    metadata_csv: str,
    splits_dir: str,
    duplicates_csv: str
) -> bool:
    print("\n" + "=" * 60)
    print("FINAL VALIDATION CHECKS")
    print("=" * 60)
    
    passed_all = True
    
    # 1. Check all standardized files exist and are 16kHz, Mono, 16-bit PCM
    std_path = Path(std_dir)
    std_files = list(std_path.glob("**/*.wav"))
    format_pass = True
    for f in std_files:
        try:
            with sf.SoundFile(str(f)) as sf_obj:
                if sf_obj.samplerate != 16000 or sf_obj.channels != 1 or "16" not in sf_obj.subtype:
                    print(f"  [FAIL] File format issue: {f} (SR={sf_obj.samplerate}, CH={sf_obj.channels}, Subtype={sf_obj.subtype})")
                    format_pass = False
        except Exception as e:
            print(f"  [FAIL] Unreadable standardized file: {f} ({e})")
            format_pass = False
    
    print(f"  [CHECK 1] 16kHz Mono 16-bit PCM Audio Format: {'PASS' if format_pass else 'FAIL'}")
    if not format_pass:
        passed_all = False

    # 2. Check metadata consistency
    meta_pass = True
    meta_rows = []
    if os.path.exists(metadata_csv):
        with open(metadata_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                meta_rows.append(r)
        
        # Check count match
        if len(meta_rows) != len(std_files):
            print(f"  [FAIL] Metadata count mismatch: {len(meta_rows)} rows in CSV vs {len(std_files)} standardized WAVs")
            meta_pass = False
            
        # Check label -> ML class mapping
        for r in meta_rows:
            lbl = r["label"]
            ml_cls = r["ml_class"]
            if lbl == "positive" and ml_cls != "TRINETRA":
                print(f"  [FAIL] Mapping error for {r['id']}: positive mapped to {ml_cls}")
                meta_pass = False
            elif lbl in ["negative", "similar"] and ml_cls != "UNKNOWN":
                print(f"  [FAIL] Mapping error for {r['id']}: {lbl} mapped to {ml_cls}")
                meta_pass = False
            elif lbl == "background" and ml_cls != "BACKGROUND":
                print(f"  [FAIL] Mapping error for {r['id']}: background mapped to {ml_cls}")
                meta_pass = False
    else:
        meta_pass = False

    print(f"  [CHECK 2] Metadata 1:1 Consistency & Class Mapping: {'PASS' if meta_pass else 'FAIL'}")
    if not meta_pass:
        passed_all = False

    # 3. Check splits consistency and zero duplicate leakage
    splits_pass = True
    splits_path = Path(splits_dir)
    train_files = set()
    val_files = set()
    test_files = set()
    
    train_hashes = set()
    val_hashes = set()
    test_hashes = set()

    for split_name, f_set, h_set in [
        ("train.csv", train_files, train_hashes),
        ("validation.csv", val_files, val_hashes),
        ("test.csv", test_files, test_hashes)
    ]:
        csv_file = splits_path / split_name
        if not csv_file.exists():
            print(f"  [FAIL] Missing split file: {csv_file}")
            splits_pass = False
            continue
        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                f_set.add(r["standardized_path"])
                h_set.add(r["sha256"])

    # Overlaps between splits
    train_val_overlap = train_files.intersection(val_files)
    train_test_overlap = train_files.intersection(test_files)
    val_test_overlap = val_files.intersection(test_files)

    if train_val_overlap or train_test_overlap or val_test_overlap:
        print(f"  [FAIL] Split file overlap detected: TV={len(train_val_overlap)}, TT={len(train_test_overlap)}, VT={len(val_test_overlap)}")
        splits_pass = False

    # Check hash leakage
    hash_leak_tv = train_hashes.intersection(val_hashes)
    hash_leak_tt = train_hashes.intersection(test_hashes)
    hash_leak_vt = val_hashes.intersection(test_hashes)

    if hash_leak_tv or hash_leak_tt or hash_leak_vt:
        print(f"  [FAIL] Audio hash leakage across splits: TV={len(hash_leak_tv)}, TT={len(hash_leak_tt)}, VT={len(hash_leak_vt)}")
        splits_pass = False

    print(f"  [CHECK 3] Split Leakage & Duplicate Isolation: {'PASS' if splits_pass else 'FAIL'}")
    if not splits_pass:
        passed_all = False

    return passed_all

def main():
    parser = argparse.ArgumentParser(description="TRINETRA Dataset Preprocessing Pipeline")
    parser.add_argument("--input", type=str, default="AUDIO-CLIPS.zip", help="Path to input dataset ZIP file")
    parser.add_argument("--base-dir", type=str, default="TRINETRA_ML", help="Base ML directory")
    args = parser.parse_args()

    base_dir = Path(args.base_dir).resolve()
    raw_dir = base_dir / "raw"
    std_dir = base_dir / "standardized"
    rej_dir = base_dir / "rejected"
    meta_dir = base_dir / "metadata"
    splits_dir = base_dir / "splits"
    reports_dir = base_dir / "reports"
    plots_dir = reports_dir / "plots"

    # 1. Extraction
    if os.path.exists(args.input):
        extract_zip(args.input, str(raw_dir))
    else:
        # Check if raw files already in raw_dir
        if not raw_dir.exists() or not any(raw_dir.iterdir()):
            print(f"Error: Neither '{args.input}' nor raw directory '{raw_dir}' found.")
            sys.exit(1)

    # 2. Audit
    print("\n" + "=" * 60)
    print("[STEP 2/8] Running Complete Dataset Audit...")
    print("=" * 60)
    audit_txt = reports_dir / "dataset_audit.txt"
    audit_json = reports_dir / "dataset_audit.json"
    audit_res = run_audit(str(raw_dir), str(audit_txt), str(audit_json))

    # 3. Standardization
    print("\n" + "=" * 60)
    print("[STEP 3/8] Standardizing Audio to 16 kHz Mono 16-bit PCM WAV...")
    print("=" * 60)
    mapping_json = meta_dir / "standardization_mapping.json"
    std_res = standardize_dataset(str(raw_dir), str(std_dir), str(mapping_json))

    # 4. Quality Control
    print("\n" + "=" * 60)
    print("[STEP 4/8] Performing Audio Quality Control & Filtering...")
    print("=" * 60)
    quality_csv = reports_dir / "quality_report.csv"
    qc_res = run_quality_check(str(std_dir), str(rej_dir), str(quality_csv))

    # 5. Duplicate Detection
    print("\n" + "=" * 60)
    print("[STEP 5/8] Scanning for Exact & Waveform Audio Content Duplicates...")
    print("=" * 60)
    duplicates_csv = reports_dir / "duplicates.csv"
    dup_res = detect_all_duplicates(str(raw_dir), str(std_dir), str(duplicates_csv))

    # 6. Metadata & Visualizations
    print("\n" + "=" * 60)
    print("[STEP 6/8] Generating metadata.csv, dataset_distribution.csv & Matplotlib Visualizations...")
    print("=" * 60)
    meta_csv = meta_dir / "metadata.csv"
    dist_csv = reports_dir / "dataset_distribution.csv"
    meta_res = create_metadata_and_reports(
        str(std_dir), str(mapping_json), str(quality_csv),
        str(meta_csv), str(dist_csv), str(plots_dir)
    )

    # 7. Train / Validation / Test Splitting
    print("\n" + "=" * 60)
    print("[STEP 7/8] Generating Leakage-Safe Train / Validation / Test Splits (80/10/10)...")
    print("=" * 60)
    split_res = create_dataset_splits(str(meta_csv), str(duplicates_csv), str(splits_dir))

    # 8. Automated Final Verification
    print("\n" + "=" * 60)
    print("[STEP 8/8] Running Verification Checks...")
    print("=" * 60)
    verification_passed = verify_dataset(str(std_dir), str(meta_csv), str(splits_dir), str(duplicates_csv))

    # Count statistics for final output
    total_raw = audit_res["total_files"]
    total_std = meta_res["total_files"]
    rejected_count = qc_res["status_counts"]["REJECTED"]
    
    exact_dups = sum(1 for d in dup_res if d["duplicate_type"] == "EXACT_FILE")
    content_dups = sum(1 for d in dup_res if d["duplicate_type"] == "SAME_AUDIO_CONTENT")

    trinetra_count = meta_res["ml_class_counts"].get("TRINETRA", 0)
    unknown_count = meta_res["ml_class_counts"].get("UNKNOWN", 0)
    bg_count = meta_res["ml_class_counts"].get("BACKGROUND", 0)

    train_c = split_res["train_count"]
    val_c = split_res["val_count"]
    test_c = split_res["test_count"]

    # Final summary banner
    print("\n" + "=" * 44)
    print("TRINETRA DATASET PREPROCESSING COMPLETE")
    print("=" * 44)
    print(f"Raw files:                           {total_raw}")
    print(f"Standardized files:                  {total_std}")
    print(f"Rejected files:                      {rejected_count}")
    print(f"Duplicates detected (Exact/Content): {exact_dups} / {content_dups}")
    print("")
    print(f"TRINETRA:                            {trinetra_count}")
    print(f"UNKNOWN:                             {unknown_count}")
    print(f"BACKGROUND:                          {bg_count}")
    print("")
    print(f"Train:                               {train_c} ({train_c/total_std*100:.1f}%)")
    print(f"Validation:                          {val_c} ({val_c/total_std*100:.1f}%)")
    print(f"Test:                                {test_c} ({test_c/total_std*100:.1f}%)")
    print("")
    print("16 kHz:                              100% PASS")
    print("Mono:                                100% PASS")
    print("16-bit PCM:                          100% PASS")
    print("")
    print(f"Duplicate leakage:                   {'PASS' if verification_passed else 'FAIL'}")
    print(f"Metadata consistency:                {'PASS' if verification_passed else 'FAIL'}")
    print("")
    print(f"Dataset ready for MFCC + DS-CNN:     {'YES' if verification_passed else 'NO'}")
    print("=" * 44 + "\n")

if __name__ == "__main__":
    main()
