#ifndef TRINETRA_WAKE_DETECTOR_H_
#define TRINETRA_WAKE_DETECTOR_H_

#include <cstdint>
#include <cstddef>
#include "config.h"

enum class WakeEvent {
    NO_EVENT = 0,
    WAKE_TRIGGERED,
    WAKE_SUPPRESSED_COOLDOWN
};

struct WakeDetectionResult {
    WakeEvent event;
    float trinetra_confidence;
    float unknown_confidence;
    float background_confidence;
    int confirmed_window_count;
    uint32_t mfcc_latency_us;
    uint32_t inference_latency_us;
    uint32_t total_latency_us;
};

class WakeDetector {
public:
    WakeDetector(float threshold = TRINETRA_CONFIDENCE_THRESHOLD,
                 int window_m = ACWE_WINDOW_M,
                 int required_n = ACWE_REQUIRED_N,
                 uint32_t cooldown_ms = WAKE_COOLDOWN_MS);

    // Process a new window's class probabilities with timing telemetry
    WakeDetectionResult ProcessWindow(const float probabilities[MODEL_NUM_CLASSES],
                                      uint64_t timestamp_ms,
                                      uint32_t mfcc_us = 0,
                                      uint32_t inference_us = 0);

    void Reset();
    void SetThreshold(float threshold) { m_threshold = threshold; }
    void SetCooldownMs(uint32_t cooldown_ms) { m_cooldown_ms = cooldown_ms; }

    float GetThreshold() const { return m_threshold; }
    int GetWindowM() const { return m_window_m; }
    int GetRequiredN() const { return m_required_n; }
    uint32_t GetCooldownMs() const { return m_cooldown_ms; }
    uint64_t GetLastTriggerTimeMs() const { return m_last_trigger_time_ms; }

private:
    float m_threshold;
    int m_window_m;
    int m_required_n;
    uint32_t m_cooldown_ms;

    bool m_history_buffer[ACWE_WINDOW_M];
    int m_history_index;
    int m_history_count;
    uint64_t m_last_trigger_time_ms;
};

#endif // TRINETRA_WAKE_DETECTOR_H_
