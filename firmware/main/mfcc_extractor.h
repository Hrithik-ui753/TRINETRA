#ifndef TRINETRA_MFCC_EXTRACTOR_H_
#define TRINETRA_MFCC_EXTRACTOR_H_

#include <cstdint>
#include <cstddef>
#include "config.h"

// Diagnostic statistics for extracted MFCC tensor
struct MFCCStats {
    float min_val;
    float max_val;
    float mean_val;
    float std_val;
};

class MFCCExtractor {
public:
    MFCCExtractor();
    ~MFCCExtractor() = default;

    // Initialize extractor (verifies static lookup tables)
    bool Init();

    // Extract standardized float MFCC features [97, 13] and optionally quantized INT8 features
    // audio_samples: 16,000 samples @ 16kHz (signed 16-bit PCM converted to float)
    // out_mfcc_standardized: buffer of size MFCC_TOTAL_ELEMENTS (1261 floats)
    // out_quantized: optional buffer of size MFCC_TOTAL_ELEMENTS (1261 int8_t)
    bool ExtractFromAudio(const int16_t* audio_samples,
                          size_t sample_count,
                          float* out_mfcc_standardized,
                          int8_t* out_quantized = nullptr,
                          uint32_t* out_elapsed_us = nullptr);

    // Compute summary statistics (min, max, mean, std) over extracted MFCC tensor
    static MFCCStats ComputeStats(const float* mfcc_features, size_t count = MFCC_TOTAL_ELEMENTS);

    // Quantize float feature element using exact INT8 model scale & zero point
    static inline int8_t QuantizeFeature(float val) {
        float q = (val / MODEL_INPUT_SCALE) + static_cast<float>(MODEL_INPUT_ZERO_POINT);
        if (q > 127.0f) q = 127.0f;
        if (q < -128.0f) q = -128.0f;
        return static_cast<int8_t>(q >= 0.0f ? (q + 0.5f) : (q - 0.5f));
    }

    // Export a compact diagnostic representation of the MFCC tensor
    static void PrintDiagnosticSummary(const MFCCStats& stats, uint32_t elapsed_us = 0);

private:
    // Internal static working buffers to avoid heap fragmentation during real-time processing
    float m_fft_real[MFCC_FFT_SIZE];
    float m_fft_imag[MFCC_FFT_SIZE];
    float m_power_spec[MFCC_FFT_SIZE / 2 + 1]; // 257 power bins
    float m_mel_energies[MFCC_NUM_MEL_BINS];     // 40 mel bins

    // Internal Radix-2 512-point FFT routine
    void ComputeFFT512(float* real, float* imag);
};

#endif // TRINETRA_MFCC_EXTRACTOR_H_
