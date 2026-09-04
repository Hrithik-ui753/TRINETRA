#include "wake_detector.h"
#include <cstdio>
#include <cstring>

WakeDetector::WakeDetector(float threshold, int window_m, int required_n, uint32_t cooldown_ms)
    : m_threshold(threshold)
    , m_window_m(window_m)
    , m_required_n(required_n)
    , m_cooldown_ms(cooldown_ms)
    , m_history_index(0)
    , m_history_count(0)
    , m_last_trigger_time_ms(0) {
    Reset();
}

void WakeDetector::Reset() {
    std::memset(m_history_buffer, 0, sizeof(m_history_buffer));
    m_history_index = 0;
    m_history_count = 0;
    m_last_trigger_time_ms = 0;
}

WakeDetectionResult WakeDetector::ProcessWindow(const float probabilities[MODEL_NUM_CLASSES],
                                               uint64_t timestamp_ms,
                                               uint32_t mfcc_us,
                                               uint32_t inference_us) {
    WakeDetectionResult res;
    res.event = WakeEvent::NO_EVENT;
    res.background_confidence = probabilities[CLASS_IDX_BACKGROUND];
    res.unknown_confidence = probabilities[CLASS_IDX_UNKNOWN];
    res.trinetra_confidence = probabilities[CLASS_IDX_TRINETRA];
    res.mfcc_latency_us = mfcc_us;
    res.inference_latency_us = inference_us;
    res.total_latency_us = mfcc_us + inference_us;

    // Single window confidence evaluation against calibrated operational threshold
    bool is_trinetra_candidate = (res.trinetra_confidence >= m_threshold);

    // Update temporal sliding history buffer for ACWE 2-of-3
    m_history_buffer[m_history_index] = is_trinetra_candidate;
    m_history_index = (m_history_index + 1) % m_window_m;
    if (m_history_count < m_window_m) {
        m_history_count++;
    }

    // Count positive activations in active M-window history
    int active_triggers = 0;
    for (int i = 0; i < m_history_count; ++i) {
        if (m_history_buffer[i]) {
            active_triggers++;
        }
    }
    res.confirmed_window_count = active_triggers;

#if TRINETRA_DEBUG_MODE
    printf("[MFCC] time=%u us | [MODEL] time=%u us\n", mfcc_us, inference_us);
    printf("[CONF] background=%.4f unknown=%.4f trinetra=%.4f\n",
           res.background_confidence, res.unknown_confidence, res.trinetra_confidence);
    printf("[ACWE] positive_count=%d/%d\n", active_triggers, m_window_m);
#endif

    // Check if temporal confirmation condition is met (e.g. 2 of 3)
    if (active_triggers >= m_required_n) {
        // Evaluate cooldown timer (1.5s post-activation debounce)
        if (m_last_trigger_time_ms == 0 || (timestamp_ms - m_last_trigger_time_ms) >= m_cooldown_ms) {
            res.event = WakeEvent::WAKE_TRIGGERED;
            m_last_trigger_time_ms = timestamp_ms;
            
            // Clear history after confirmed trigger to prevent multiple immediate firings
            std::memset(m_history_buffer, 0, sizeof(m_history_buffer));
            m_history_count = 0;
            m_history_index = 0;

            printf("[WAKE] >>> TRINETRA DETECTED <<< (Confidence: %.4f, Total Compute: %.2f ms)\n\n",
                   res.trinetra_confidence, res.total_latency_us / 1000.0f);
        } else {
            res.event = WakeEvent::WAKE_SUPPRESSED_COOLDOWN;
#if TRINETRA_DEBUG_MODE
            printf("[COOLDOWN] Wake suppressed (Debounce active: %llu ms remaining)\n\n",
                   static_cast<unsigned long long>(m_cooldown_ms - (timestamp_ms - m_last_trigger_time_ms)));
#endif
        }
    }

    return res;
}
