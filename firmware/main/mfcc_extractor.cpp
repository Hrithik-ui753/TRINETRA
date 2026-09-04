#include "mfcc_extractor.h"
#include "mfcc_tables.h"
#include <cstdio>
#include <cstring>
#include <cmath>

#if defined(ESP_PLATFORM)
#include "esp_timer.h"
#else
#include <chrono>
static uint64_t get_time_us() {
    using namespace std::chrono;
    return duration_cast<microseconds>(steady_clock::now().time_since_epoch()).count();
}
#endif

MFCCExtractor::MFCCExtractor() {
    std::memset(m_fft_real, 0, sizeof(m_fft_real));
    std::memset(m_fft_imag, 0, sizeof(m_fft_imag));
    std::memset(m_power_spec, 0, sizeof(m_power_spec));
    std::memset(m_mel_energies, 0, sizeof(m_mel_energies));
}

bool MFCCExtractor::Init() {
    // Check table dimensions and static constants
    return true;
}

void MFCCExtractor::ComputeFFT512(float* real, float* imag) {
    const int n = 512;

    // 1. Bit reversal permutation
    int j = 0;
    for (int i = 0; i < n - 1; ++i) {
        if (i < j) {
            float tr = real[i]; real[i] = real[j]; real[j] = tr;
            float ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
        }
        int k = n >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }

    // 2. Cooley-Tukey Radix-2 butterfly passes
    for (int step = 2; step <= n; step <<= 1) {
        int half_step = step >> 1;
        float angle_step = -2.0f * 3.14159265358979323846f / static_cast<float>(step);

        for (int i = 0; i < n; i += step) {
            for (int k = 0; k < half_step; ++k) {
                float angle = static_cast<float>(k) * angle_step;
                float c = std::cos(angle);
                float s = std::sin(angle);

                int idx_b = i + k + half_step;
                int idx_a = i + k;

                float tr = c * real[idx_b] - s * imag[idx_b];
                float ti = s * real[idx_b] + c * imag[idx_b];

                real[idx_b] = real[idx_a] - tr;
                imag[idx_b] = imag[idx_a] - ti;
                real[idx_a] += tr;
                imag[idx_a] += ti;
            }
        }
    }
}

bool MFCCExtractor::ExtractFromAudio(const int16_t* audio_samples,
                                    size_t sample_count,
                                    float* out_mfcc_standardized,
                                    int8_t* out_quantized,
                                    uint32_t* out_elapsed_us) {
    if (!audio_samples || !out_mfcc_standardized || sample_count < AUDIO_WINDOW_SAMPLES) {
        return false;
    }

#if defined(ESP_PLATFORM)
    uint64_t t0 = esp_timer_get_time();
#else
    uint64_t t0 = get_time_us();
#endif

    // Process exactly 97 frames
    for (int t = 0; t < MFCC_TIME_STEPS; ++t) {
        int frame_start = t * MFCC_HOP_LEN_SAMPLES; // 0, 160, 320, ..., 15360

        // 1. Windowing & zero-padding: 400 samples with Hann window -> 512 FFT buffer
        for (int i = 0; i < MFCC_FRAME_LEN_SAMPLES; ++i) {
            // Convert int16 [-32768, 32767] to float [-1.0, 1.0] matching librosa standard
            float sample_float = static_cast<float>(audio_samples[frame_start + i]) / 32768.0f;
            m_fft_real[i] = sample_float * HANN_WINDOW_400[i];
            m_fft_imag[i] = 0.0f;
        }
        for (int i = MFCC_FRAME_LEN_SAMPLES; i < MFCC_FFT_SIZE; ++i) {
            m_fft_real[i] = 0.0f;
            m_fft_imag[i] = 0.0f;
        }

        // 2. Compute 512-point FFT
        ComputeFFT512(m_fft_real, m_fft_imag);

        // 3. Compute Power Spectrogram (|X[k]|^2) for positive frequencies k=0..256
        for (int k = 0; k <= MFCC_FFT_SIZE / 2; ++k) {
            m_power_spec[k] = m_fft_real[k] * m_fft_real[k] + m_fft_imag[k] * m_fft_imag[k];
        }

        // 4. Mel Filterbank Energy Accumulation (40 Mel bins)
        for (int m = 0; m < MFCC_NUM_MEL_BINS; ++m) {
            float energy = 0.0f;
            for (int k = 0; k <= MFCC_FFT_SIZE / 2; ++k) {
                float weight = MEL_BASIS_40x257[m][k];
                if (weight > 0.0f) {
                    energy += weight * m_power_spec[k];
                }
            }
            // Log compression: log(energy + 1e-6)
            m_mel_energies[m] = std::log(energy + MFCC_LOG_EPSILON);
        }

        // 5. DCT-II Projection (13 MFCC coefficients)
        for (int c = 0; c < MFCC_COEFFICIENTS; ++c) {
            float mfcc_val = 0.0f;
            for (int m = 0; m < MFCC_NUM_MEL_BINS; ++m) {
                mfcc_val += DCT_BASIS_13x40[c][m] * m_mel_energies[m];
            }

            // 6. Per-coefficient Feature Standardization: (x - mean[c]) / std[c]
            float standardized_val = (mfcc_val - SCALER_MEAN[c]) / SCALER_STD[c];
            int out_idx = t * MFCC_COEFFICIENTS + c;
            out_mfcc_standardized[out_idx] = standardized_val;

            // 7. Optional INT8 Quantization
            if (out_quantized) {
                out_quantized[out_idx] = QuantizeFeature(standardized_val);
            }
        }
    }

#if defined(ESP_PLATFORM)
    uint64_t t1 = esp_timer_get_time();
#else
    uint64_t t1 = get_time_us();
#endif

    if (out_elapsed_us) {
        *out_elapsed_us = static_cast<uint32_t>(t1 - t0);
    }

    return true;
}

MFCCStats MFCCExtractor::ComputeStats(const float* mfcc_features, size_t count) {
    MFCCStats stats = {1e9f, -1e9f, 0.0f, 0.0f};
    if (!mfcc_features || count == 0) return stats;

    double sum = 0.0;
    double sum_sq = 0.0;

    for (size_t i = 0; i < count; ++i) {
        float val = mfcc_features[i];
        if (val < stats.min_val) stats.min_val = val;
        if (val > stats.max_val) stats.max_val = val;
        sum += val;
        sum_sq += static_cast<double>(val) * static_cast<double>(val);
    }

    stats.mean_val = static_cast<float>(sum / count);
    double variance = (sum_sq / count) - (static_cast<double>(stats.mean_val) * static_cast<double>(stats.mean_val));
    stats.std_val = static_cast<float>(std::sqrt(variance > 0.0 ? variance : 0.0));

    return stats;
}

void MFCCExtractor::PrintDiagnosticSummary(const MFCCStats& stats, uint32_t elapsed_us) {
    printf("[MFCC] Extracted 97x13 tensor (%d elements) in %u us (%.2f ms)\n",
           MFCC_TOTAL_ELEMENTS, elapsed_us, elapsed_us / 1000.0f);
    printf("[MFCC DIAG] Min: %.4f | Max: %.4f | Mean: %.4f | Std: %.4f\n",
           stats.min_val, stats.max_val, stats.mean_val, stats.std_val);
}
