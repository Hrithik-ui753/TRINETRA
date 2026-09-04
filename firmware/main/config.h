#ifndef TRINETRA_CONFIG_H_
#define TRINETRA_CONFIG_H_

#include <cstdint>

// ==============================================================================
// TRINETRA ESP32-S3 FIRMWARE CONFIGURATION - STAGE 7
// Target Hardware: ESP32-S3-DevKitC-1 (N16R8)
// Dual Microphone Audio Frontend + MFCC + DS-CNN Wake Activator
// ==============================================================================

// Operating Modes: 1 for verbose debug logs, 0 for silent deployment
#define TRINETRA_DEBUG_MODE             1

// Microphone Channel Operating Mode:
// MODE 1: Single microphone (MIC 1 / Left channel only)
// MODE 2: Dual microphone deterministic fusion (MIC 1 + MIC 2)
#define MIC_MODE_LEFT_ONLY              1
#define MIC_MODE_DUAL_FUSION            2
#define TRINETRA_MIC_MODE               MIC_MODE_DUAL_FUSION

// Audio Sampling Specifications
#define AUDIO_SAMPLE_RATE_HZ            16000
#define AUDIO_CHANNELS_CAPTURE          2           // Stereo I2S capture (Left & Right mics)
#define AUDIO_CHANNELS_PROCESSED        1           // Mono output after channel handling/fusion
#define AUDIO_BITS_PER_SAMPLE           16
#define AUDIO_WINDOW_DURATION_SEC       1.0f
#define AUDIO_WINDOW_SAMPLES            16000       // 1.0 second @ 16kHz
#define AUDIO_STEP_SAMPLES              3200        // 200 ms sliding stride (5 inferences / sec)

// I2S & DMA Peripheral Specifications
#define I2S_PORT_NUM                    0
#define I2S_DMA_BUFFER_COUNT            4
#define I2S_DMA_BUFFER_SAMPLES          512         // 512 stereo samples per DMA frame (32ms)

// Hardware GPIO Pin Configuration (ESP32-S3 DevKitC-1 with Dual I2S Microphones e.g. INMP441)
// Shared Clock & Word Select bus for synchronized Left/Right sampling:
#define I2S_MIC_SCK_PIN                 14          // BCLK (Bit Clock)
#define I2S_MIC_WS_PIN                  15          // WS / LRCLK (Word Select / Left-Right Clock)
#define I2S_MIC_SD_PIN                  16          // SD / DATA (Serial Data In - multiplexed L/R)

// Audio Preprocessing Parameters
#define AUDIO_PREPROC_DC_ALPHA          0.995f      // DC offset removal filter coefficient
#define AUDIO_PREPROC_NOISE_GATE_RMS    50.0f       // Silence / low energy threshold (RMS in 16-bit PCM)
#define AUDIO_PREPROC_MAX_GAIN          1.0f        // Conservative gain normalization ceiling
#define AUDIO_PREPROC_CLIP_LIMIT        32767       // 16-bit signed clipping boundary

// MFCC Feature Extraction Specifications (Matching Training Pipeline)
#define MFCC_TIME_STEPS                 97          // 97 temporal frames
#define MFCC_COEFFICIENTS               13          // 13 MFCC cepstral coefficients
#define MFCC_TOTAL_ELEMENTS             (MFCC_TIME_STEPS * MFCC_COEFFICIENTS) // 1261
#define MFCC_FRAME_LEN_SAMPLES          400         // 25 ms @ 16kHz
#define MFCC_HOP_LEN_SAMPLES            160         // 10 ms @ 16kHz
#define MFCC_FFT_SIZE                   512         // Power-of-two FFT size
#define MFCC_NUM_MEL_BINS               40          // 40 Mel triangular filterbanks
#define MFCC_FREQ_MIN_HZ                20.0f       // 20 Hz lower frequency cutoff
#define MFCC_FREQ_MAX_HZ                8000.0f     // 8000 Hz upper frequency cutoff (Nyquist)
#define MFCC_LOG_EPSILON                1e-6f       // Log energy epsilon floor

// Model Architecture & Classification
#define MODEL_NUM_CLASSES               3
#define CLASS_IDX_BACKGROUND            0
#define CLASS_IDX_UNKNOWN               1
#define CLASS_IDX_TRINETRA              2

// Exact Model Quantization Parameters (Derived from trinetra_ds_cnn_int8.tflite)
#define MODEL_INPUT_SCALE               0.03873676f
#define MODEL_INPUT_ZERO_POINT          (-10)
#define MODEL_OUTPUT_SCALE              0.00390625f
#define MODEL_OUTPUT_ZERO_POINT         (-128)

// Wake-Word Detection Parameters (Calibrated ACWE 2-of-3 & 1.5s Cooldown)
#define TRINETRA_CONFIDENCE_THRESHOLD   0.85f       // Calibrated operational threshold
#define ACWE_WINDOW_M                   3           // Sliding confirmation window size (3 windows)
#define ACWE_REQUIRED_N                 2           // Required triggers within M windows (2 of 3)
#define WAKE_COOLDOWN_MS                1500        // Post-trigger debounce cooldown (1.5s)

// Memory & Tensor Arena
#define TENSOR_ARENA_SIZE_BYTES         (32 * 1024) // 32 KB allocated arena (safe margin)

// Benchmark Configuration
#define BENCHMARK_ITERATIONS            100

// Feature Standardizer Mean & Std Parameters (from feature_scaler.json)
static const float SCALER_MEAN[MFCC_COEFFICIENTS] = {
    -61.8257942199707f,
    8.564366340637207f,
    -1.4111181497573853f,
    1.5786627531051636f,
    0.04578765854239464f,
    -0.7533886432647705f,
    -0.18504655361175537f,
    -0.7902313470840454f,
    -0.226285919547081f,
    0.09702202677726746f,
    -0.20964813232421875f,
    0.03860686719417572f,
    -0.4816851019859314f
};

static const float SCALER_STD[MFCC_COEFFICIENTS] = {
    19.15948486328125f,
    9.033406257629395f,
    6.352353096008301f,
    4.48090124130249f,
    3.2358508110046387f,
    3.13946795463562f,
    2.865800380706787f,
    2.4524338245391846f,
    2.3202426433563232f,
    1.790804147720337f,
    1.752048373222351f,
    1.8288671970367432f,
    1.7560794353485107f
};

#endif // TRINETRA_CONFIG_H_
