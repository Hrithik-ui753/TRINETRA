/**
 * @file telemetry_reporter.h
 * @brief ESP32-S3 Telemetry Serialization and Transport Layer (Stage 9B).
 * Formats runtime system health, audio metrics, and TinyML inference statistics into JSON.
 */

#pragma once

#include <cstdint>
#include <string>
#include "config.h"

namespace trinetra {

struct ESP32TelemetryData {
    char device_id[32];
    uint32_t uptime_seconds;
    uint32_t free_heap_bytes;
    int8_t wifi_rssi_dbm;
    bool wifi_connected;
    bool server_connected;
    bool mic1_active;
    bool mic2_active;
    uint32_t sample_rate_hz;
    float mfcc_latency_ms;
    float inference_latency_ms;
    float wake_threshold;
    float last_wake_confidence;
    bool has_temp_sensor;
    float temperature_c;
    bool has_humidity_sensor;
    float humidity_percent;
    bool has_door_sensor;
    bool door_closed;
    bool has_voltage_sensor;
    float voltage_v;
    uint32_t active_fault_count;
    char last_fault_msg[64];
};

class TelemetryReporter {
public:
    TelemetryReporter();
    ~TelemetryReporter() = default;

    /**
     * @brief Acquires live hardware stats from ESP-IDF runtime.
     */
    void collect_live_telemetry(ESP32TelemetryData& data, float last_mfcc_ms, float last_infer_ms, float last_conf);

    /**
     * @brief Serializes telemetry to a standardized JSON string payload.
     * Unconnected hardware sensors are explicitly rendered as null with provenance tags.
     */
    std::string serialize_json(const ESP32TelemetryData& data);

    /**
     * @brief Sends telemetry JSON payload to backend endpoint over HTTP POST.
     */
    bool send_http_telemetry(const char* backend_url, const std::string& json_payload);
};

} // namespace trinetra
