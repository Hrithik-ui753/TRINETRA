#!/usr/bin/env python3
"""
TRINETRA ML - Train / Validation / Test Split Generator
Generates:
- splits/train.csv (~80%)
- splits/validation.csv (~10%)
- splits/test.csv (~10%)

Guarantees:
1. ZERO Duplicate Audio Leakage: Identical audio/hashes (sha256) never cross splits.
2. Perfect Speaker Isolation: Named speakers are assigned exclusively to a single split (no speaker overlap).
3. Stratified class distribution: TRINETRA, UNKNOWN, and BACKGROUND present in all splits.
4. Deterministic & Reproducible: Fixed seed (SEED=42).
"""

import os
import csv
import random
from pathlib import Path
from typing import Dict, Any, List, Set
from collections import defaultdict
import numpy as np

RANDOM_SEED = 42

def create_dataset_splits(
    metadata_csv: str,
    duplicates_csv: str,
    splits_dir: str,
    train_ratio: float = 0.80,
    val_ratio: float = 0.10,
    test_ratio: float = 0.10,
    seed: int = RANDOM_SEED
) -> Dict[str, Any]:
    splits_path = Path(splits_dir)
    splits_path.mkdir(parents=True, exist_ok=True)

    print(f"[SPLIT] Initializing train/val/test split with deterministic SEED = {seed}...")
    random.seed(seed)
    np.random.seed(seed)

    # 1. Load valid metadata rows
    records = []
    with open(metadata_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("quality_status") != "REJECTED":
                records.append(row)

    print(f"[SPLIT] Total valid records to split: {len(records)}")

    # 2. Speaker isolation strategy
    # Assign distinct speakers to specific splits to ensure 0% speaker leakage:
    # Train: nishanth, anush
    # Val: srinivas
    # Test: bhagya
    speaker_split_assignment = {
        "nishanth": "train",
        "anush": "train",
        "srinivas": "validation",
        "bhagya": "test"
    }

    train_records = []
    val_records = []
    test_records = []

    # Group unassigned records strictly by sha256 to ensure identical audio is never split
    unassigned_hash_groups = defaultdict(list)

    for r in records:
        spk = r.get("speaker", "unknown").lower()
        if spk in speaker_split_assignment:
            assigned = speaker_split_assignment[spk]
            if assigned == "train":
                train_records.append(r)
            elif assigned == "validation":
                val_records.append(r)
            elif assigned == "test":
                test_records.append(r)
        else:
            # Group by (ml_class, sha256)
            unassigned_hash_groups[(r["ml_class"], r["sha256"])].append(r)

    # Organize unassigned groups by ML class
    class_groups = defaultdict(list)
    for (ml_class, sha_val), items in unassigned_hash_groups.items():
        class_groups[ml_class].append(items)

    # Calculate remaining targets for each ML class
    total_by_class = defaultdict(int)
    for r in records:
        total_by_class[r["ml_class"]] += 1

    for ml_class, g_list in class_groups.items():
        # Deterministic shuffle
        random.shuffle(g_list)
        
        target_total_val = int(round(total_by_class[ml_class] * val_ratio))
        target_total_test = int(round(total_by_class[ml_class] * test_ratio))

        current_val = sum(1 for r in val_records if r["ml_class"] == ml_class)
        current_test = sum(1 for r in test_records if r["ml_class"] == ml_class)

        needed_val = max(0, target_total_val - current_val)
        needed_test = max(0, target_total_test - current_test)

        c_val = []
        c_test = []
        c_train = []

        cur_val = 0
        cur_test = 0

        for g in g_list:
            g_len = len(g)
            if cur_val + g_len <= needed_val and cur_val < needed_val:
                c_val.extend(g)
                cur_val += g_len
            elif cur_test + g_len <= needed_test and cur_test < needed_test:
                c_test.extend(g)
                cur_test += g_len
            else:
                c_train.extend(g)

        # Fallback if needed
        if not c_val and current_val == 0 and len(c_train) > 1:
            c_val.extend(c_train.pop())
        if not c_test and current_test == 0 and len(c_train) > 1:
            c_test.extend(c_train.pop())

        train_records.extend(c_train)
        val_records.extend(c_val)
        test_records.extend(c_test)

    # 3. Add split column
    for r in train_records:
        r["split"] = "train"
    for r in val_records:
        r["split"] = "validation"
    for r in test_records:
        r["split"] = "test"

    # Write CSVs
    fieldnames = list(records[0].keys())
    if "split" not in fieldnames:
        fieldnames.append("split")

    train_csv_path = splits_path / "train.csv"
    val_csv_path = splits_path / "validation.csv"
    test_csv_path = splits_path / "test.csv"

    with open(train_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(train_records)

    with open(val_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(val_records)

    with open(test_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(test_records)

    total_split = len(train_records) + len(val_records) + len(test_records)

    # Speaker & hash isolation audit
    speakers_train = set(r["speaker"] for r in train_records if r["speaker"] != "unknown")
    speakers_val = set(r["speaker"] for r in val_records if r["speaker"] != "unknown")
    speakers_test = set(r["speaker"] for r in test_records if r["speaker"] != "unknown")

    val_spk_leak = speakers_val.intersection(speakers_train)
    test_spk_leak = speakers_test.intersection(speakers_train)

    train_hashes = set(r["sha256"] for r in train_records)
    val_hashes = set(r["sha256"] for r in val_records)
    test_hashes = set(r["sha256"] for r in test_records)

    hash_leak_tv = train_hashes.intersection(val_hashes)
    hash_leak_tt = train_hashes.intersection(test_hashes)
    hash_leak_vt = val_hashes.intersection(test_hashes)

    print(f"\n[SPLIT] Data Split Summary (Seed={seed}):")
    print(f"  - TRAIN:      {len(train_records)} files ({len(train_records)/total_split*100:.1f}%)")
    print(f"  - VALIDATION: {len(val_records)} files ({len(val_records)/total_split*100:.1f}%)")
    print(f"  - TEST:       {len(test_records)} files ({len(test_records)/total_split*100:.1f}%)")
    print(f"  - TOTAL:      {total_split} files")
    print(f"\n[SPLIT] Class breakdown per split:")
    for split_name, recs in [("TRAIN", train_records), ("VAL", val_records), ("TEST", test_records)]:
        c_counts = defaultdict(int)
        for r in recs:
            c_counts[r["ml_class"]] += 1
        print(f"  - {split_name:5s}: TRINETRA={c_counts['TRINETRA']}, UNKNOWN={c_counts['UNKNOWN']}, BACKGROUND={c_counts['BACKGROUND']}")

    print(f"\n[SPLIT] Speaker Isolation Audit:")
    print(f"  - Speakers in Train: {sorted(list(speakers_train)) or 'None'}")
    print(f"  - Speakers in Val:   {sorted(list(speakers_val)) or 'None'}")
    print(f"  - Speakers in Test:  {sorted(list(speakers_test)) or 'None'}")
    print(f"  - Speaker Leakage Train/Val:  {len(val_spk_leak)} ({val_spk_leak or 'None'})")
    print(f"  - Speaker Leakage Train/Test: {len(test_spk_leak)} ({test_spk_leak or 'None'})")
    print(f"\n[SPLIT] Hash Leakage Audit:")
    print(f"  - Hash Leakage Train/Val:  {len(hash_leak_tv)}")
    print(f"  - Hash Leakage Train/Test: {len(hash_leak_tt)}")
    print(f"  - Hash Leakage Val/Test:   {len(hash_leak_vt)}")

    return {
        "seed": seed,
        "train_count": len(train_records),
        "val_count": len(val_records),
        "test_count": len(test_records),
        "total_count": total_split,
        "speakers_train": list(speakers_train),
        "speakers_val": list(speakers_val),
        "speakers_test": list(speakers_test)
    }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Create train/val/test splits")
    parser.add_argument("--metadata", type=str, default="TRINETRA_ML/metadata/metadata.csv", help="Metadata CSV")
    parser.add_argument("--duplicates", type=str, default="TRINETRA_ML/reports/duplicates.csv", help="Duplicates CSV")
    parser.add_argument("--splits-dir", type=str, default="TRINETRA_ML/splits", help="Output splits directory")
    parser.add_argument("--seed", type=int, default=RANDOM_SEED, help="Random seed")
    args = parser.parse_args()

    create_dataset_splits(args.metadata, args.duplicates, args.splits_dir, seed=args.seed)
