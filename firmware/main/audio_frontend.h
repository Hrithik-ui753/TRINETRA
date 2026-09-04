#ifndef TRINETRA_AUDIO_FRONTEND_H_
#define TRINETRA_AUDIO_FRONTEND_H_

#include <cstdint>
#include <cstddef>
#include "config.h"

// Audio Preprocessing & Diagnostic Statistics
struct AudioPreprocStats {
    float rms_energy;
    float peak_amplitude;
    float dc_offset;
    bool is_silent;
    bool has_clipped;
};

class AudioFrontend {
public:
    AudioFrontend();
    ~AudioFrontend();

    // Initialize audio ring buffer and I2S dual-microphone peripheral
    bool Init(bool enable_live_mic = false, int mic_mode = TRINETRA_MIC_MODE);

    // Feed raw stereo interleaved [L0, R0, L1, R1, ...] 16-bit PCM samples
    void PushStereoSamples(const int16_t* interleaved_stereo, size_t stereo_sample_pairs);

    // Feed mono 16-bit PCM samples directly into ring buffer
    void PushMonoSamples(const int16_t* mono_samples, size_t count);

    // Extract the latest 1.0-second (16,000 samples) window into out_window_samples
    bool GetLatestWindow(int16_t* out_window_samples);

    // Preprocess a 1.0s window: DC offset removal, RMS, clipping protection, silence detection
    AudioPreprocStats PreprocessAudioWindow(int16_t* in_out_samples, size_t sample_count);

    // Hardware capture abstraction (reads stereo I2S from physical mics or generates test signals)
    size_t AudioCaptureRead(int16_t* out_interleaved_stereo, size_t max_sample_pairs);

    // Deterministic dual-channel fusion: mono[n] = (mic1[n] + mic2[n]) / 2 (avoids overflow)
    static inline int16_t FuseStereoSample(int16_t left, int16_t right) {
        int32_t sum = static_cast<int32_t>(left) + static_cast<int32_t>(right);
        return static_cast<int16_t>(sum / 2);
    }

    // Generate deterministic stereo test waveform for edge benchmark & validation
    void GenerateStereoTestSignal(int16_t* out_interleaved_stereo, size_t sample_pairs, float freq_hz = 440.0f);

    // Getters
    size_t GetBufferedSampleCount() const { return m_buffered_samples; }
    bool IsLiveMicEnabled() const { return m_live_mic_enabled; }
    int GetMicMode() const { return m_mic_mode; }
    void SetMicMode(int mode) { m_mic_mode = mode; }

private:
    // Statically allocated internal ring buffer (16,000 samples = 32,000 bytes)
    int16_t m_ring_buffer[AUDIO_WINDOW_SAMPLES];
    size_t m_write_index;
    size_t m_buffered_samples;
    bool m_live_mic_enabled;
    int m_mic_mode;
    bool m_is_initialized;

    // Running DC offset filter state
    float m_dc_prev_in;
    float m_dc_prev_out;
};

#endif // TRINETRA_AUDIO_FRONTEND_H_
