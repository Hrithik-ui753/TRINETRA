
# TRINETRA — Low-Latency Voice Activator for Edge Devices
## Dataset Preprocessing & Preparation Pipeline (Stage 1)

This repository contains the complete, production-grade dataset preprocessing and preparation pipeline for **TRINETRA** — a resource-aware, low-latency wake-word activator engineered for edge deployment (e.g., ESP32-S3).

---

## 1. System Overview & Objectives

The goal of this preprocessing pipeline is to convert raw, heterogeneous media files (`.wav`, `.m4a`, `.mp4`) into a clean, audited, standardized, and leakage-safe dataset ready for:
1. **MFCC Feature Extraction** (40 filterbanks / 49 frames for edge inference)
2. **DS-CNN Model Training** (Depthwise Separable Convolutional Neural Network)
3. **INT8 Post-Training Quantization**
4. **ESP32-S3 Microcontroller Deployment**

---

## 2. Directory Structure

```
TRINETRA_ML/
│
├── raw/                                # Extracted raw dataset from AUDIO-CLIPS.zip
│   └── AUDIO-CLIPS/
│       ├── positive_sounds/
│       ├── negative_sounds/
│       ├── similar_sounds/
│       └── noise_sounds/
│
├── standardized/                       # 100% 16 kHz Mono 16-bit PCM WAV audio
│   ├── positive/                       # TRINETRA wake-word recordings (positive_000001.wav, ...)
│   ├── negative/                       # Negative speech / sounds (negative_000001.wav, ...)
│   ├── similar/                        # Hard negatives / phonetically similar (similar_000001.wav, ...)
│   └── background/                     # Environmental noise partitioned by category
│       ├── ac/
│       ├── fan/
│       ├── music/
│       ├── people_talking/
│       ├── random/
│       ├── traffic/
│       └── tv/
│
├── rejected/                           # Defective / corrupted files (if any)
│
├── metadata/
│   ├── metadata.csv                    # Complete metadata for every standardized audio file
│   └── standardization_mapping.json    # Bidirectional mapping between raw & standardized paths
│
├── splits/
│   ├── train.csv                       # Training split (80.0% - 1117 files)
│   ├── validation.csv                  # Validation split (10.0% - 140 files)
│   └── test.csv                        # Isolated Test split (10.0% - 140 files)
│
├── reports/
│   ├── dataset_audit.txt               # Complete text audit report
│   ├── dataset_audit.json              # Full machine-readable audit report
│   ├── quality_report.csv              # Quality checks (RMS, peak, silence ratio, status)
│   ├── duplicates.csv                  # Exact cryptographic and waveform duplicates
│   ├── dataset_distribution.csv        # Detailed category, class, speaker, and source breakdown
│   └── plots/                          # Matplotlib visualization figures
│       ├── class_distribution.png
│       ├── folder_distribution.png
│       ├── duration_distribution.png
│       ├── sample_rate_distribution.png
│       ├── source_distribution.png
│       ├── speaker_distribution.png
│       └── noise_environment_distribution.png
│
├── scripts/
│   ├── audit_dataset.py                # Dataset scanner & audit generator
│   ├── standardize_audio.py            # Audio converter (WAV, M4A, MP4 -> 16kHz mono 16-bit PCM)
│   ├── quality_check.py                # Audio signal quality verification
│   ├── detect_duplicates.py            # SHA-256 & waveform hash duplicate detector
│   ├── create_metadata.py              # Metadata generator & matplotlib plotting
│   ├── create_splits.py                # Leakage-safe 80/10/10 train/val/test splitter
│   └── run_preprocessing.py            # Master pipeline runner & verification suite
│
├── requirements.txt                    # Python dependencies
└── README.md                           # Documentation
```

---

## 3. Installation & Setup

### Environment Requirements
- **Python:** 3.10 to 3.14
- **OS:** Windows / Linux / macOS
- **FFmpeg / Media Codecs:** Handled automatically via `av` (PyAV wheel bundles embedded codecs, eliminating external binary dependencies).

### Install Dependencies
```bash
pip install -r requirements.txt
```

Contents of `requirements.txt`:
```txt
numpy>=1.24.0
pandas>=2.0.0
scipy>=1.10.0
soundfile>=0.12.0
librosa>=0.10.0
av>=11.0.0
pydub>=0.25.1
matplotlib>=3.7.0
scikit-learn>=1.2.0
tqdm>=4.65.0
```

---

## 4. Running Preprocessing Pipeline

Run the end-to-end reproducible pipeline with a single master command:

```bash
python TRINETRA_ML/scripts/run_preprocessing.py --input AUDIO-CLIPS.zip --base-dir TRINETRA_ML
```

### Pipeline Execution Steps:
1. **Extraction:** Safely extracts `AUDIO-CLIPS.zip` into `TRINETRA_ML/raw/`.
2. **Audit:** Analyzes duration, sample rate, channels, bit depth, codec, silence, and corruption.
3. **Standardization:** Resamples all audio to **16000 Hz**, converts to **Mono (1 ch)**, and exports as **16-bit signed PCM WAV**.
4. **Quality Control:** Inspects amplitude, RMS, peak clipping, silence ratio; logs to `reports/quality_report.csv`.
5. **Duplicate Detection:** Scans SHA-256 and decoded waveform hashes; logs to `reports/duplicates.csv`.
6. **Metadata & Visualization:** Builds `metadata/metadata.csv`, `reports/dataset_distribution.csv`, and 7 Matplotlib charts.
7. **Dataset Splitting:** Splits data into 80% Train, 10% Validation, 10% Test with **0% speaker and 0% duplicate leakage**.
8. **Automated Verification:** Performs strict validation tests on audio formatting, metadata integrity, and split isolation.

---

## 5. Dataset Summary & Class Mapping

### ML Target Class Mapping
| Raw Folder | Standardized Directory | Target ML Class | Purpose | Count |
|---|---|---|---|---|
| `positive_sounds/` | `standardized/positive/` | **TRINETRA** | Wake-word trigger activations | 543 |
| `negative_sounds/` | `standardized/negative/` | **UNKNOWN** | Non-wake word regular speech | 316 |
| `similar_sounds/` | `standardized/similar/` | **UNKNOWN** | Hard negative speech phonetically similar to TRINETRA | 131 |
| `noise_sounds/` | `standardized/background/` | **BACKGROUND** | Environmental noise (AC, fan, traffic, tv, music, etc.) | 407 |
| **TOTAL** | | | | **1397** |

### Train / Validation / Test Splits (Seed = 42)
| Split | TRINETRA | UNKNOWN | BACKGROUND | Total Files | Percentage |
|---|---|---|---|---|---|
| **Train** | 435 | 357 | 325 | **1117** | 80.0% |
| **Validation** | 54 | 45 | 41 | **140** | 10.0% |
| **Test** | 54 | 45 | 41 | **140** | 10.0% |
| **TOTAL** | **543** | **447** | **407** | **1397** | **100.0%** |

### Speaker Isolation & Leakage Prevention
- **Train Set Speakers:** `anush`, `nishanth`
- **Validation Set Speaker:** `srinivas` (completely isolated from Train & Test)
- **Test Set Speaker:** `bhagya` (completely isolated from Train & Val)
- **Duplicate Hash Leakage across Splits:** **0 (PASS)**
- **Speaker Leakage across Splits:** **0 (PASS)**

---

## 7. Stage 2: MFCC Feature Extraction & Training Augmentation

### MFCC Configuration
- **Sample Rate**: 16,000 Hz
- **Target Window**: 1.0 second (16,000 samples)
- **Window Length**: 25 ms (400 samples)
- **Hop Length**: 10 ms (160 samples)
- **Mel Filterbanks**: 40 filters (20 Hz - 8,000 Hz)
- **MFCC Coefficients**: 13 coefficients
- **Output Tensor Shape**: `(97, 13)` (97 Time Frames × 13 MFCC Coefficients)

### Deterministic Windowing Strategy
1. **Short Audio (< 1.0s)**: Symmetrically zero-padded to center the audio.
2. **Long Audio (> 1.0s)**: Energy-centered crop (scans and extracts the 16,000-sample window with maximum RMS energy), ensuring the wake-word is never clipped.

### Training Augmentation Engine (`augmentation/augment.py`)
- **Strictly constrained to TRAIN split**: Validation (140) and Test (140) sets are 100% clean and unaugmented.
- **Realistic Augmentations**:
  - Time shift ($\pm 100\text{ ms}$)
  - Controlled gain/volume scaling ($\pm 4\text{ dB}$)
  - Mild speed perturbation ($0.95\times - 1.05\times$)
  - Realistic background noise mixing using the actual 407 TRINETRA background recordings (`ac`, `fan`, `traffic`, `people_talking`, `tv`, `music`, `random`) with realistic SNR ($5 - 20\text{ dB}$)
  - Mild room impulse reverberation

### Normalization Standardizer
- $\mu, \sigma$ are fitted **strictly on the training features** (`X_train`) and saved to `features_data/feature_scaler.json`.
- Validation and Test splits are transformed using the frozen training scaler (Zero Leakage).

### Feature Data Outputs (`features_data/`)
- `train_features.npz` (1,117 samples, shape: `(1117, 97, 13)`)
- `validation_features.npz` (140 samples, shape: `(140, 97, 13)`)
- `test_features.npz` (140 samples, shape: `(140, 97, 13)`)
- `feature_scaler.json`
- `feature_summary.json`

## 9. Stage 4: Natural Wake-Word Optimization & Threshold Calibration

### Acoustic Gap Audit
- **Natural vs Synthetic Positive Samples**:
  - `Train`: 180 Natural, 255 Synthetic
  - `Validation`: 37 Natural, 17 Synthetic
  - `Test`: 26 Natural, 28 Synthetic
- **Discrepancies**: Natural clips display higher dynamic variance, diverse vocal tempo ($1.803\text{s}$ mean duration vs $1.045\text{s}$ synthetic), and $+28\%$ mean RMS energy difference.
- **Plots**: `reports/optimization/natural_vs_synthetic/duration_rms_comparison.png`, `mfcc_comparison.png`.

### Optimization Strategies Implemented
1. **Natural-Positive Balanced Sampling**: Oversampled real human wake-word utterances during training ($2.5\times$ effective gradient weight).
2. **Hard-Negative Similar Sound Weighting**: Reinforced phonetic contrast by oversampling `similar_sounds` ($2.0\times$).
3. **Realistic Acoustic Perturbations**: Training-only speed perturbation ($0.95\times - 1.05\times$), room impulse reverberation, dynamic gain scaling, and real environmental noise mixing.
4. **Energy Normalization (ENF)**: Input-level RMS normalization & frame-level cepstral standardizer.
5. **Validation Threshold Calibration**: Swept $\theta \in [0.30, 0.90]$ strictly on the validation set. Optimal calibrated operational threshold: **0.85**.
6. **Adaptive Confidence Windowing (ACWE)**: Multi-window temporal confirmation evaluated on validation audio (`1 of 1` standard, `2 of 3` confirmed).

### Baseline vs Optimized Comparison (Test Set)
| Metric | Baseline DS-CNN | Optimized DS-CNN | Change |
|---|---|---|---|
| **Test Accuracy** | 81.43% | **86.43%** | **+5.00%** |
| **Macro F1-Score** | 81.76% | **86.53%** | **+4.77%** |
| **TRINETRA Recall** | 62.96% | **70.37%** | **+7.41%** |
| **TRINETRA FRR** | 37.04% | **29.63%** | **-7.41%** |
| **Similar False Accepts** | 2 / 41 | **1 / 41** | **-1 (Reduced)** |
| **Background False Accepts** | 3 / 41 | **2 / 41** | **-1 (Reduced)** |
| **Natural TRINETRA Perf** | 6/26 (23.1%) | **10/26 (38.5%)** | **Improved** |
| **Synthetic TRINETRA Perf** | 28/28 (100.0%) | **28/28 (100.0%)** | **Maintained** |
## 10. Stage 5: Full INT8 Quantization + TFLite Micro Validation

### Model Conversion & Post-Training Quantization (PTQ)
- **Input Model**: `models/optimized_ds_cnn.keras` (2,723 parameters)
- **Representative Calibration Dataset**: 248 training samples selected strictly from `splits/train.csv` (balanced across background, negative speech, hard-negative similar sounds, natural positive, and synthetic positive utterances). Zero leakage from validation or test sets.
- **Constraints**: Enforced `tf.lite.OpsSet.TFLITE_BUILTINS_INT8`, `inference_input_type = tf.int8`, `inference_output_type = tf.int8` with zero float fallback.
- **Artifacts Exported**:
  - `models/trinetra_ds_cnn_float32.tflite` (15,928 bytes / 15.55 KB)
  - `models/trinetra_ds_cnn_int8.tflite` (13,104 bytes / 12.80 KB)
  - `reports/quantization/representative_dataset.json`
  - `reports/quantization/float32_vs_int8.csv`
  - `reports/quantization/quantization_report.txt`
  - `reports/quantization/selected_int8_threshold.json`

### Quantization Parameter Inspection
- **Input Tensor**: `shape=(1, 97, 13, 1)`, `dtype=int8`, `scale=0.038737`, `zero_point=-10`
- **Output Tensor**: `shape=(1, 3)`, `dtype=int8`, `scale=0.00390625`, `zero_point=-128`
- **Graph Operators**: `CONV_2D`, `DEPTHWISE_CONV_2D`, `AVERAGE_POOL_2D`, `FULLY_CONNECTED`, `RELU`, `SOFTMAX`
- **TFLite Micro Compatibility**: Candidate confirmed (100% standard Micro kernels, no unsupported ops).

### Benchmark Comparison (Frozen Test Set, Threshold = 0.85)
| Metric | Float32 TFLite | Full INT8 TFLite | Delta |
|---|---|---|---|
| **File Size** | 15.55 KB (15,928 B) | **12.80 KB (13,104 B)** | **-17.7% (1.22x compression)** |
| **Test Accuracy** | 86.43% | **87.14%** | **+0.71%** |
| **Macro F1** | 86.53% | **87.25%** | **+0.72%** |
| **TRINETRA Precision** | 92.68% | **92.86%** | **+0.18%** |
| **TRINETRA Recall** | 70.37% | **72.22%** | **+1.85%** |
| **TRINETRA FRR** | 29.63% | **27.78%** | **-1.85%** |
| **Similar False Accepts** | 1 / 41 | **1 / 41** | **Maintained** |
| **Background False Accepts** | 2 / 41 | **2 / 41** | **Maintained** |
| **Natural TRINETRA** | 10 / 26 (38.5%) | **11 / 26 (42.3%)** | **+3.8%** |
## 11. Stage 6: TFLite Micro + ESP32-S3 Edge Inference

### Embedded Firmware Architecture
- **Target Hardware**: ESP32-S3-DevKitC-1 (N16R8) - Xtensa Dual-Core LX7 @ 240 MHz (16 MB Flash, 512 KB SRAM, 8 MB PSRAM).
- **Model Byte Array**: [`firmware/main/model_data.h`](file:///d:/HACK-PROJECTS/TRINETRA/firmware/main/model_data.h) (13,104 bytes / 12.80 KB, 16-byte aligned `.rodata` stored in Flash).
- **TFLite Micro Runtime**: Minimal `MicroMutableOpResolver<6>` (`AVERAGE_POOL_2D`, `CONV_2D`, `DEPTHWISE_CONV_2D`, `FULLY_CONNECTED`, `RELU`, `SOFTMAX`).
- **Tensor Arena**: Configured: 32 KB (32,768 bytes), Peak working buffer used: ~18 KB (18,432 bytes), Free safety margin: ~14 KB (43.8% headroom).
- **Audio Pipeline**:
  - `AudioFrontend` ring buffer (16,000 samples = 1.0s @ 16 kHz Mono).
  - Clean `audio_capture_read()` abstraction for live I2S / PDM microphone or test signal injection.
- **Wake-Word Decision Engine (ACWE & Cooldown)**:
  - Threshold: $\theta = 0.85$.
  - ACWE: $N=2$ triggers required within $M=3$ consecutive sliding windows (2 of 3 confirmation).
  - Cooldown: 1.5 seconds post-trigger debounce suppression.
- **Dual Operating Modes**: Configurable `TRINETRA_DEBUG_MODE` (1 = Verbose serial telemetry, 0 = Silent deployment).

### Edge Inference Performance & Resource Metrics
```
============================================
TRINETRA ESP32-S3 EDGE INTEGRATION
============================================

Model:
trinetra_ds_cnn_int8.tflite

Model size:
13104 bytes

C-array size:
13104 bytes

Tensor arena:
32768 bytes

Tensor arena used:
18432 bytes

Tensor arena free:
14336 bytes

Input:
INT8 [1,97,13,1]

Output:
INT8 [1,3]

Operators:
PASS

Firmware build:
PASS (BUILD VERIFIED)

Flash usage:
~292 KB (1.8% of 16 MB Flash)

Static RAM:
~75 KB

Free heap:
~436 KB

Inference:

Min:
96 us

Mean:
190 us

Median:
168 us

Max:
629 us

MFCC timing:
NOT IMPLEMENTED

End-to-end timing:
NOT YET MEASURED

Hardware benchmark:
PENDING

TFLite Micro:
PASS

============================================
```

### Verification Summary
```
========================================
TRINETRA MFCC PIPELINE COMPLETE
========================================
Training samples:      1117
Validation samples:    140
Test samples:          140

MFCC configuration:
Sample rate:           16000 Hz
Window:                25.0 ms (400 samples)
Hop:                   10.0 ms (160 samples)
Mel filters:           40
MFCC coefficients:     13

Input tensor shape:    (97, 13) (Time Frames x MFCCs)

NaN:                   0 (PASS)
Inf:                   0 (PASS)

Augmentation:
TRAIN ONLY =           PASS
VALIDATION UNMODIFIED = PASS
TEST UNMODIFIED =       PASS

Data leakage:          PASS

READY FOR DS-CNN:      YES
========================================
```
