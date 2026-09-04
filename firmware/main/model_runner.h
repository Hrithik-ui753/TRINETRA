#ifndef TRINETRA_MODEL_RUNNER_H_
#define TRINETRA_MODEL_RUNNER_H_

#include <cstdint>
#include <cstddef>
#include "config.h"

// Forward declarations for TFLite Micro classes
namespace tflite {
class Model;
class MicroInterpreter;
template <unsigned int tOpCount>
class MicroMutableOpResolver;
class ErrorReporter;
}

class ModelRunner {
public:
    ModelRunner();
    ~ModelRunner();

    // Initialize TFLite Micro model, arena, and minimal operator resolver
    bool Init();

    // Run inference on raw float MFCC features (automatically quantizes input)
    bool RunInference(const float* mfcc_features, float* out_probabilities, uint32_t* out_inference_us = nullptr);

    // Run inference on pre-quantized INT8 input
    bool RunInferenceInt8(const int8_t* quantized_input, float* out_probabilities, uint32_t* out_inference_us = nullptr);

    // Quantize float feature element using model scale & zero point
    static inline int8_t QuantizeInput(float val) {
        float q = (val / MODEL_INPUT_SCALE) + (float)MODEL_INPUT_ZERO_POINT;
        if (q > 127.0f) q = 127.0f;
        if (q < -128.0f) q = -128.0f;
        return static_cast<int8_t>(q >= 0 ? (q + 0.5f) : (q - 0.5f));
    }

    // Dequantize INT8 output element to probability
    static inline float DequantizeOutput(int8_t val) {
        return (static_cast<float>(val) - (float)MODEL_OUTPUT_ZERO_POINT) * MODEL_OUTPUT_SCALE;
    }

    // Memory & Arena inspection
    size_t GetArenaAllocatedBytes() const;
    size_t GetArenaUsedBytes() const;
    size_t GetArenaFreeBytes() const;
    bool IsInitialized() const { return m_is_initialized; }

    // Print diagnostic banner
    void PrintDiagnostics() const;

private:
    uint8_t* m_tensor_arena;
    const tflite::Model* m_model;
    tflite::MicroInterpreter* m_interpreter;
    tflite::MicroMutableOpResolver<6>* m_resolver;
    bool m_is_initialized;
};

#endif // TRINETRA_MODEL_RUNNER_H_
