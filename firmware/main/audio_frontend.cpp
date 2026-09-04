#include "audio_frontend.h"
#include <cstdio>
#include <cstring>
#include <cmath>

#if defined(ESP_PLATFORM)
#include "driver/i2s_std.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_err.h"

static const char* TAG = "TRINETRA_AUDIO";
static i2s_chan_handle_t s_rx_handle = nullptr;
#endif

AudioFrontend::AudioFrontend()
    : m_write_index(0)
    , m_buffered_samples(0)
    , m_live_mic_enabled(false)
    , m_mic_mode(TRINETRA_MIC_MODE)
    , m_is_initialized(false)
    , m_dc_prev_in(0.0f)
    , m_dc_prev_out(0.0f) {
    std::memset(m_ring_buffer, 0, sizeof(m_ring_buffer));
}

AudioFrontend::~AudioFrontend() {
#if defined(ESP_PLATFORM)
    if (s_rx_handle) {
        i2s_channel_disable(s_rx_handle);
        i2s_del_channel(s_rx_handle);
        s_rx_handle = nullptr;
    }
#endif
}

bool AudioFrontend::Init(bool enable_live_mic, int mic_mode) {
    if (m_is_initialized) return true;

    printf("[AUDIO] Initializing Static 16 kHz Audio Ring Buffer (%d samples = 1.0s, %zu bytes)...\n",
           AUDIO_WINDOW_SAMPLES, sizeof(m_ring_buffer));

    std::memset(m_ring_buffer, 0, sizeof(m_ring_buffer));
    m_write_index = 0;
    m_buffered_samples = 0;
    m_live_mic_enabled = enable_live_mic;
    m_mic_mode = mic_mode;
    m_dc_prev_in = 0.0f;
    m_dc_prev_out = 0.0f;

#if defined(ESP_PLATFORM)
    if (enable_live_mic) {
        printf("[AUDIO] Initializing Dual-Microphone I2S RX Peripheral (SCK=%d, WS=%d, SD=%d)...\n",
               I2S_MIC_SCK_PIN, I2S_MIC_WS_PIN, I2S_MIC_SD_PIN);
        printf("[AUDIO] Configuration: 16000 Hz, 2 Channels (Stereo Left+Right), 16-bit PCM\n");
        printf("[AUDIO] DMA: %d buffers x %d samples (%d bytes/buffer)\n",
               I2S_DMA_BUFFER_COUNT, I2S_DMA_BUFFER_SAMPLES,
               I2S_DMA_BUFFER_SAMPLES * 2 * (int)sizeof(int16_t));

        i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
        chan_cfg.dma_desc_num = I2S_DMA_BUFFER_COUNT;
        chan_cfg.dma_frame_num = I2S_DMA_BUFFER_SAMPLES;
        chan_cfg.auto_clear = true;

        esp_err_t err = i2s_new_channel(&chan_cfg, nullptr, &s_rx_handle);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "Failed to allocate I2S RX channel: %s", esp_err_to_name(err));
            return false;
        }

        i2s_std_config_t std_cfg = {
            .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(AUDIO_SAMPLE_RATE_HZ),
            .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
            .gpio_cfg = {
                .mclk = I2S_GPIO_UNUSED,
                .bclk = static_cast<gpio_num_t>(I2S_MIC_SCK_PIN),
                .ws = static_cast<gpio_num_t>(I2S_MIC_WS_PIN),
                .dout = I2S_GPIO_UNUSED,
                .din = static_cast<gpio_num_t>(I2S_MIC_SD_PIN),
                .invert_flags = {
                    .mclk_inv = false,
                    .bclk_inv = false,
                    .ws_inv = false,
                },
            },
        };

        err = i2s_channel_init_std_mode(s_rx_handle, &std_cfg);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "Failed to initialize I2S standard mode: %s", esp_err_to_name(err));
            return false;
        }

        err = i2s_channel_enable(s_rx_handle);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "Failed to enable I2S RX channel: %s", esp_err_to_name(err));
            return false;
        }

        printf("[AUDIO] I2S Dual-Microphone Frontend initialized successfully.\n");
    } else {
        printf("[AUDIO] Running in BENCHMARK / EMULATION mode (Live I2S disabled).\n");
    }
#else
    printf("[AUDIO] Host platform: Running in EMULATION / BENCHMARK mode.\n");
#endif

    m_is_initialized = true;
    return true;
}

void AudioFrontend::PushStereoSamples(const int16_t* interleaved_stereo, size_t stereo_sample_pairs) {
    if (!interleaved_stereo || stereo_sample_pairs == 0) return;

    for (size_t i = 0; i < stereo_sample_pairs; ++i) {
        int16_t left_sample = interleaved_stereo[2 * i];
        int16_t right_sample = interleaved_stereo[2 * i + 1];

        int16_t processed_sample = 0;
        if (m_mic_mode == MIC_MODE_DUAL_FUSION) {
            // MODE 2: Deterministic dual-channel average fusion
            processed_sample = FuseStereoSample(left_sample, right_sample);
        } else {
            // MODE 1: MIC 1 (Left channel only)
            processed_sample = left_sample;
        }

        m_ring_buffer[m_write_index] = processed_sample;
        m_write_index = (m_write_index + 1) % AUDIO_WINDOW_SAMPLES;
        if (m_buffered_samples < AUDIO_WINDOW_SAMPLES) {
            m_buffered_samples++;
        }
    }
}

void AudioFrontend::PushMonoSamples(const int16_t* mono_samples, size_t count) {
    if (!mono_samples || count == 0) return;

    for (size_t i = 0; i < count; ++i) {
        m_ring_buffer[m_write_index] = mono_samples[i];
        m_write_index = (m_write_index + 1) % AUDIO_WINDOW_SAMPLES;
        if (m_buffered_samples < AUDIO_WINDOW_SAMPLES) {
            m_buffered_samples++;
        }
    }
}

bool AudioFrontend::GetLatestWindow(int16_t* out_window_samples) {
    if (!out_window_samples || m_buffered_samples < AUDIO_WINDOW_SAMPLES) {
        return false;
    }

    // Read 16,000 samples sequentially starting from oldest sample in circular buffer
    size_t read_idx = m_write_index; // Oldest unoverwritten sample
    for (size_t i = 0; i < AUDIO_WINDOW_SAMPLES; ++i) {
        out_window_samples[i] = m_ring_buffer[read_idx];
        read_idx = (read_idx + 1) % AUDIO_WINDOW_SAMPLES;
    }
    return true;
}

AudioPreprocStats AudioFrontend::PreprocessAudioWindow(int16_t* in_out_samples, size_t sample_count) {
    AudioPreprocStats stats = {0.0f, 0.0f, 0.0f, false, false};
    if (!in_out_samples || sample_count == 0) return stats;

    double sum_sq = 0.0;
    double sum_raw = 0.0;
    const float alpha = AUDIO_PREPROC_DC_ALPHA;

    for (size_t i = 0; i < sample_count; ++i) {
        float x = static_cast<float>(in_out_samples[i]);
        sum_raw += x;

        // DC offset removal: y[n] = x[n] - x[n-1] + alpha * y[n-1]
        float y = x - m_dc_prev_in + alpha * m_dc_prev_out;
        m_dc_prev_in = x;
        m_dc_prev_out = y;

        // Clipping protection
        if (y > AUDIO_PREPROC_CLIP_LIMIT) {
            y = AUDIO_PREPROC_CLIP_LIMIT;
            stats.has_clipped = true;
        } else if (y < -AUDIO_PREPROC_CLIP_LIMIT) {
            y = -AUDIO_PREPROC_CLIP_LIMIT;
            stats.has_clipped = true;
        }

        int16_t cleaned_sample = static_cast<int16_t>(y);
        in_out_samples[i] = cleaned_sample;

        float abs_val = std::fabs(y);
        if (abs_val > stats.peak_amplitude) {
            stats.peak_amplitude = abs_val;
        }
        sum_sq += static_cast<double>(y) * static_cast<double>(y);
    }

    stats.dc_offset = static_cast<float>(sum_raw / sample_count);
    stats.rms_energy = static_cast<float>(std::sqrt(sum_sq / sample_count));
    stats.is_silent = (stats.rms_energy < AUDIO_PREPROC_NOISE_GATE_RMS);

    return stats;
}

size_t AudioFrontend::AudioCaptureRead(int16_t* out_interleaved_stereo, size_t max_sample_pairs) {
    if (!m_is_initialized || !out_interleaved_stereo || max_sample_pairs == 0) return 0;

    if (m_live_mic_enabled) {
#if defined(ESP_PLATFORM)
        if (s_rx_handle) {
            size_t bytes_read = 0;
            size_t bytes_to_read = max_sample_pairs * 2 * sizeof(int16_t); // 2 channels (stereo)
            esp_err_t err = i2s_channel_read(s_rx_handle, out_interleaved_stereo, bytes_to_read, &bytes_read, pdMS_TO_TICKS(100));
            if (err == ESP_OK) {
                return bytes_read / (2 * sizeof(int16_t));
            }
        }
#endif
        // Fallback if hardware read fails
        GenerateStereoTestSignal(out_interleaved_stereo, max_sample_pairs);
        return max_sample_pairs;
    } else {
        GenerateStereoTestSignal(out_interleaved_stereo, max_sample_pairs);
        return max_sample_pairs;
    }
}

void AudioFrontend::GenerateStereoTestSignal(int16_t* out_interleaved_stereo, size_t sample_pairs, float freq_hz) {
    static float phase = 0.0f;
    float phase_step = 2.0f * 3.14159265f * freq_hz / AUDIO_SAMPLE_RATE_HZ;

    for (size_t i = 0; i < sample_pairs; ++i) {
        float base_val = std::sin(phase) * 6000.0f;
        // MIC 1 (Left): in-phase signal
        out_interleaved_stereo[2 * i] = static_cast<int16_t>(base_val);
        // MIC 2 (Right): slightly attenuated / noisy companion channel
        out_interleaved_stereo[2 * i + 1] = static_cast<int16_t>(base_val * 0.95f);

        phase += phase_step;
        if (phase >= 2.0f * 3.14159265f) {
            phase -= 2.0f * 3.14159265f;
        }
    }
}
