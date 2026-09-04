#include <cstdio>
#include <cstring>
#include <cmath>
#include <algorithm>
#include <vector>

#include "config.h"
#include "model_runner.h"
#include "audio_frontend.h"
#include "mfcc_extractor.h"
#include "wake_detector.h"

#if defined(ESP_PLATFORM)
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_heap_caps.h"
#else
#include <chrono>
#include <thread>
static void vTaskDelay(uint32_t ms) {
    std::this_thread::sleep_for(std::chrono::milliseconds(ms));
}
static uint64_t esp_timer_get_time() {
    using namespace std::chrono;
    return duration_cast<microseconds>(steady_clock::now().time_since_epoch()).count();
}
static size_t esp_get_free_heap_size() {
    return 320 * 1024; // Simulated ESP32-S3 internal SRAM free heap
}
static size_t esp_get_minimum_free_heap_size() {
    return 290 * 1024;
}
#endif

// Global Application Engine Instances
static ModelRunner s_model_runner;
static AudioFrontend s_audio_frontend;
static MFCCExtractor s_mfcc_extractor;
static WakeDetector s_wake_detector(TRINETRA_CONFIDENCE_THRESHOLD, ACWE_WINDOW_M, ACWE_REQUIRED_N, WAKE_COOLDOWN_MS);

// Statically allocated working buffers for zero runtime heap churn
static int16_t s_raw_stereo_chunk[AUDIO_STEP_SAMPLES * 2]; // 3200 stereo sample pairs (200ms)
static int16_t s_analysis_window[AUDIO_WINDOW_SAMPLES];     // 16,000 samples (1.0s mono context)
static float s_mfcc_features[MFCC_TOTAL_ELEMENTS];         // 97 x 13 = 1261 floats
static int8_t s_quantized_features[MFCC_TOTAL_ELEMENTS];   // 97 x 13 = 1261 int8_t
static float s_class_probabilities[MODEL_NUM_CLASSES];

// Benchmark Data Structures
struct LatencyMetrics {
    uint32_t min_us;
    double mean_us;
    uint32_t median_us;
    uint32_t max_us;
};

static LatencyMetrics compute_metrics(std::vector<uint32_t>& records) {
    LatencyMetrics m = {0, 0.0, 0, 0};
    if (records.empty()) return m;

    std::sort(records.begin(), records.end());
    m.min_us = records.front();
    m.max_us = records.back();
    m.median_us = records[records.size() / 2];

    uint64_t total = 0;
    for (uint32_t val : records) total += val;
    m.mean_us = static_cast<double>(total) / records.size();
    return m;
}

static void run_system_benchmark() {
    printf("\n============================================\n");
    printf("TRINETRA ESP32-S3 BENCHMARK (100 ITERATIONS)\n");
    printf("============================================\n");

    // 1. Synthesize 1.0s audio test waveform
    s_audio_frontend.GenerateStereoTestSignal(s_raw_stereo_chunk, AUDIO_STEP_SAMPLES);
    for (int i = 0; i < 5; ++i) {
        s_audio_frontend.PushStereoSamples(s_raw_stereo_chunk, AUDIO_STEP_SAMPLES);
    }
    s_audio_frontend.GetLatestWindow(s_analysis_window);

    // Warm-up execution
    uint32_t warm_mfcc_us = 0;
    uint32_t warm_infer_us = 0;
    s_mfcc_extractor.ExtractFromAudio(s_analysis_window, AUDIO_WINDOW_SAMPLES, s_mfcc_features, s_quantized_features, &warm_mfcc_us);
    s_model_runner.RunInferenceInt8(s_quantized_features, s_class_probabilities, &warm_infer_us);

    std::vector<uint32_t> mfcc_latencies;
    std::vector<uint32_t> infer_latencies;
    std::vector<uint32_t> post_latencies;
    std::vector<uint32_t> total_latencies;
    mfcc_latencies.reserve(BENCHMARK_ITERATIONS);
    infer_latencies.reserve(BENCHMARK_ITERATIONS);
    post_latencies.reserve(BENCHMARK_ITERATIONS);
    total_latencies.reserve(BENCHMARK_ITERATIONS);

    for (int i = 0; i < BENCHMARK_ITERATIONS; ++i) {
        uint64_t t_start = esp_timer_get_time();

        // 1. Audio Preprocessing
        AudioPreprocStats pre_stats = s_audio_frontend.PreprocessAudioWindow(s_analysis_window, AUDIO_WINDOW_SAMPLES);

        // 2. MFCC Extraction
        uint32_t mfcc_us = 0;
        s_mfcc_extractor.ExtractFromAudio(s_analysis_window, AUDIO_WINDOW_SAMPLES, s_mfcc_features, s_quantized_features, &mfcc_us);

        // 3. DS-CNN Inference
        uint32_t infer_us = 0;
        s_model_runner.RunInferenceInt8(s_quantized_features, s_class_probabilities, &infer_us);

        // 4. Post-processing / ACWE decision
        uint64_t t_post_start = esp_timer_get_time();
        WakeDetectionResult wake_res = s_wake_detector.ProcessWindow(s_class_probabilities, t_post_start / 1000, mfcc_us, infer_us);
        uint64_t t_end = esp_timer_get_time();
        uint32_t post_us = static_cast<uint32_t>(t_end - t_post_start);
        uint32_t total_us = static_cast<uint32_t>(t_end - t_start);

        mfcc_latencies.push_back(mfcc_us);
        infer_latencies.push_back(infer_us);
        post_latencies.push_back(post_us);
        total_latencies.push_back(total_us);
    }

    LatencyMetrics mfcc_m = compute_metrics(mfcc_latencies);
    LatencyMetrics infer_m = compute_metrics(infer_latencies);
    LatencyMetrics post_m = compute_metrics(post_latencies);
    LatencyMetrics total_m = compute_metrics(total_latencies);

    printf("\n[TIMING BREAKDOWN - 100 ITERATIONS]\n");
    printf("1. MFCC Feature Extraction (97x13):\n");
    printf("   Min: %u us | Mean: %.1f us | Median: %u us | Max: %u us\n",
           mfcc_m.min_us, mfcc_m.mean_us, mfcc_m.median_us, mfcc_m.max_us);
    printf("2. DS-CNN INT8 Model Inference:\n");
    printf("   Min: %u us | Mean: %.1f us | Median: %u us | Max: %u us\n",
           infer_m.min_us, infer_m.mean_us, infer_m.median_us, infer_m.max_us);
    printf("3. Post-Processing & ACWE Engine:\n");
    printf("   Min: %u us | Mean: %.1f us | Median: %u us | Max: %u us\n",
           post_m.min_us, post_m.mean_us, post_m.median_us, post_m.max_us);
    printf("4. Total Computational Latency:\n");
    printf("   Min: %u us | Mean: %.1f us | Median: %u us | Max: %u us\n",
           total_m.min_us, total_m.mean_us, total_m.median_us, total_m.max_us);
    printf("============================================\n\n");
}

extern "C" void app_main(void) {
    printf("\n\n============================================\n");
    printf("TRINETRA EDGE ACTIVATOR - STAGE 7 FIRMWARE\n");
    printf("Dual-Mic Audio Frontend + MFCC + DS-CNN\n");
    printf("Target: ESP32-S3-DevKitC-1 (N16R8)\n");
    printf("============================================\n\n");

    // Memory Telemetry: Step 1 - Startup
    size_t heap_boot = esp_get_free_heap_size();
    printf("[HEAP] Free internal SRAM at startup: %zu bytes (%.2f KB)\n", heap_boot, heap_boot / 1024.0f);

    // 1. Initialize TFLite Micro Model Runner
    if (!s_model_runner.Init()) {
        printf("[FATAL] Failed to initialize model runner. Halting.\n");
        return;
    }
    size_t heap_after_model = esp_get_free_heap_size();
    printf("[HEAP] Free SRAM after model load:    %zu bytes (%.2f KB)\n", heap_after_model, heap_after_model / 1024.0f);

    // 2. Initialize MFCC Extractor
    if (!s_mfcc_extractor.Init()) {
        printf("[FATAL] Failed to initialize MFCC extractor. Halting.\n");
        return;
    }

    // 3. Initialize Audio Frontend (Dual-Mic I2S)
    bool live_mic = false; // Set to true when flashing to physical hardware
    s_audio_frontend.Init(live_mic, TRINETRA_MIC_MODE);
    size_t heap_after_audio = esp_get_free_heap_size();
    printf("[HEAP] Free SRAM after audio init:    %zu bytes (%.2f KB)\n", heap_after_audio, heap_after_audio / 1024.0f);

    // 4. Diagnostic Banner
    s_model_runner.PrintDiagnostics();

    // 5. Run Latency Benchmark (100 iterations)
    run_system_benchmark();

    // 6. Live / Emulated Streaming Loop
    printf("\n[STREAM] Starting Real-Time Audio Streaming Pipeline...\n");
    printf("[STREAM] Sample Rate:    %d Hz\n", AUDIO_SAMPLE_RATE_HZ);
    printf("[STREAM] Microphones:    2 Channels (Dual-Mic Fusion Mode: %s)\n",
           s_audio_frontend.GetMicMode() == MIC_MODE_DUAL_FUSION ? "Stereo Average" : "Left Only");
    printf("[STREAM] Analysis Window:1.0s (16,000 samples)\n");
    printf("[STREAM] Slide Step:     200 ms (3,200 samples per evaluation)\n");
    printf("[STREAM] ACWE Conf:      %d of %d confirmed windows\n", ACWE_REQUIRED_N, ACWE_WINDOW_M);
    printf("[STREAM] Wake Threshold: %.2f\n", TRINETRA_CONFIDENCE_THRESHOLD);
    printf("[STREAM] Cooldown:       %d ms\n", WAKE_COOLDOWN_MS);
    printf("[STREAM] Telemetry Mode: %s\n\n", TRINETRA_DEBUG_MODE ? "TRINETRA_DEBUG_MODE (Verbose)" : "DEPLOYMENT (Silent)");

    uint32_t stream_step = 0;
    while (stream_step < 20) {
        stream_step++;
        uint64_t current_time_ms = esp_timer_get_time() / 1000;

        // Step A: Audio Capture (200 ms stereo chunk)
        size_t pairs_read = s_audio_frontend.AudioCaptureRead(s_raw_stereo_chunk, AUDIO_STEP_SAMPLES);
        s_audio_frontend.PushStereoSamples(s_raw_stereo_chunk, pairs_read);

#if TRINETRA_DEBUG_MODE
        printf("[AUDIO] sample_rate=%d captured_pairs=%zu\n", AUDIO_SAMPLE_RATE_HZ, pairs_read);
#endif

        // Step B: Sliding Window Evaluation
        if (s_audio_frontend.GetLatestWindow(s_analysis_window)) {
            // Step C: Audio Preprocessing (DC removal, RMS calculation, clipping protection)
            AudioPreprocStats preproc = s_audio_frontend.PreprocessAudioWindow(s_analysis_window, AUDIO_WINDOW_SAMPLES);

            // Step D: MFCC Feature Extraction (97x13)
            uint32_t mfcc_elapsed_us = 0;
            s_mfcc_extractor.ExtractFromAudio(s_analysis_window,
                                              AUDIO_WINDOW_SAMPLES,
                                              s_mfcc_features,
                                              s_quantized_features,
                                              &mfcc_elapsed_us);

#if TRINETRA_DEBUG_MODE
            printf("[MFCC] frames=%d coefficients=%d time=%u us\n",
                   MFCC_TIME_STEPS, MFCC_COEFFICIENTS, mfcc_elapsed_us);
#endif

            // Step E: DS-CNN INT8 Model Inference
            uint32_t infer_elapsed_us = 0;
            s_model_runner.RunInferenceInt8(s_quantized_features, s_class_probabilities, &infer_elapsed_us);

            // Step F: ACWE Temporal Confirmation & Wake Detector State Machine
            WakeDetectionResult wake_res = s_wake_detector.ProcessWindow(
                s_class_probabilities,
                current_time_ms,
                mfcc_elapsed_us,
                infer_elapsed_us
            );

            if (wake_res.event == WakeEvent::WAKE_TRIGGERED) {
                // High-priority GPIO / Peripheral Trigger
                printf("[EVENT] >>> TRINETRA WAKE TRIGGER DISPATCHED (Confidence: %.4f) <<<\n\n",
                       wake_res.trinetra_confidence);
            }
        }

        vTaskDelay(200); // 200 ms real-time stride
    }

    printf("\n[SHUTDOWN] Streaming loop complete.\n");
}

#if !defined(ESP_PLATFORM)
int main() {
    app_main();
    return 0;
}
#endif
