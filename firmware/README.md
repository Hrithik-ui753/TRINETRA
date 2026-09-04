# TRINETRA ESP32-S3 Edge Firmware (Stage 7)

Low-Latency, Resource-Aware Edge Voice Activator powered by a 2,723-parameter Depthwise-Separable CNN, on-device 97x13 MFCC extraction engine, dual-microphone audio frontend, and TensorFlow Lite Micro.

---

## 1. Target Hardware Specifications
- **Board**: ESP32-S3-DevKitC-1 (N16R8)
- **SoC**: Xtensa Dual-Core 32-bit LX7 @ 240 MHz (with Vector Instructions / PIE)
- **Flash**: 16 MB Quad SPI Flash
- **RAM**: 512 KB Internal SRAM + 8 MB Octal PSRAM
- **Microphones**: Dual I2S Digital Microphones (INMP441 / ICS-43434 / MSM261S4030H0)
  - **SCK / BCLK**: GPIO 14 (Shared Bit Clock)
  - **WS / LRCLK**: GPIO 15 (Shared Word Select / Left-Right Clock)
  - **SD / DATA**: GPIO 16 (Serial Data In - multiplexed Left & Right channels)
  - **Left Mic**: L/R Pin tied to GND
  - **Right Mic**: L/R Pin tied to 3.3V / VDD

---

## 2. Firmware Architecture

```
                 +-----------------------------------------------+
                 |  Dual I2S Microphones (16 kHz Stereo PCM)     |
                 |  MIC 1 (Left) + MIC 2 (Right) on GPIO 14,15,16|
                 +-----------------------------------------------+
                                         |
                                         v
                 +-----------------------------------------------+
                 | AudioFrontend: Stereo Capture & DMA           |
                 | Mode 2: Deterministic Fusion (L + R) / 2      |
                 | Preprocessing: DC Removal + RMS + Clip Guard  |
                 | Static 1.0s Ring Buffer (16,000 samples)      |
                 +-----------------------------------------------+
                                         |
                                         v
                 +-----------------------------------------------+
                 | On-Device MFCCExtractor (97 frames x 13 mels) |
                 | (25 ms Hann window, 10 ms hop, 512-pt FFT,    |
                 |  40 HTK mel filterbanks, DCT-II Orthogonal)   |
                 +-----------------------------------------------+
                                         |
                                         v
                 +-----------------------------------------------+
                 | Feature Standardizer & INT8 Quantization      |
                 | z = (mfcc - mean) / std                       |
                 | q = round(z / 0.03873676) - 10 [-128, 127]    |
                 +-----------------------------------------------+
                                         |
                                         v
                 +-----------------------------------------------+
                 | TFLite Micro DS-CNN ModelRunner               |
                 | (2,723 params, 13,104 bytes INT8 binary)      |
                 | Tensor Arena: 32 KB                           |
                 +-----------------------------------------------+
                                         |
                                         v
                 +-----------------------------------------------+
                 | WakeDetector: ACWE State Machine              |
                 | (Threshold 0.85, 2-of-3 confirmed windows,    |
                 |  1.5s post-trigger cooldown debounce)         |
                 +-----------------------------------------------+
                                         |
                                         v
                 +-----------------------------------------------+
                 | High-Priority GPIO / IPC Wake Event Dispatch  |
                 +-----------------------------------------------+
```

---

## 3. Configuration (`main/config.h`)

| Parameter | Value | Description |
|---|---|---|
| `TRINETRA_DEBUG_MODE` | `1` | Verbose serial telemetry (`0` for silent deployment) |
| `TRINETRA_MIC_MODE` | `MIC_MODE_DUAL_FUSION` | Deterministic dual-microphone averaging (`(L+R)/2`) |
| `AUDIO_SAMPLE_RATE_HZ` | `16000` | 16 kHz Audio Sampling |
| `AUDIO_CHANNELS_CAPTURE`| `2` | Stereo I2S capture (Left + Right microphones) |
| `AUDIO_WINDOW_SAMPLES` | `16000` | 1.0-second inference analysis window |
| `AUDIO_STEP_SAMPLES` | `3200` | 200 ms sliding stride (5 inferences / second) |
| `MFCC_TIME_STEPS` | `97` | 97 temporal frames |
| `MFCC_COEFFICIENTS` | `13` | 13 MFCC cepstral coefficients |
| `TENSOR_ARENA_SIZE_BYTES` | `32768` | 32 KB Tensor Arena |
| `MODEL_INPUT_SCALE` | `0.03873676f` | Exact input INT8 quantization scale |
| `MODEL_INPUT_ZERO_POINT` | `-10` | Exact input INT8 zero point |
| `TRINETRA_CONFIDENCE_THRESHOLD` | `0.85f` | Calibrated wake threshold |
| `ACWE_REQUIRED_N` | `2` | 2 required activations |
| `ACWE_WINDOW_M` | `3` | within last 3 consecutive sliding windows |
| `WAKE_COOLDOWN_MS` | `1500` | 1.5s post-activation debounce timer |

---

## 4. Building & Flashing with ESP-IDF

```bash
# 1. Set ESP-IDF environment
. $IDF_PATH/export.sh

# 2. Set target to ESP32-S3
idf.py set-target esp32s3

# 3. Build firmware
idf.py build

# 4. Flash and monitor
idf.py -p COM3 flash monitor
```
