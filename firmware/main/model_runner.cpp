#include "model_runner.h"
#include "model_data.h"
#include "config.h"

#include <cstdio>
#include <cstring>
#include <cmath>

#if defined(ESP_PLATFORM)
#include "esp_timer.h"
#include "esp_log.h"
#include "esp_heap_caps.h"
#else
#include <chrono>
static uint64_t esp_timer_get_time() {
    using namespace std::chrono;
    return duration_cast<microseconds>(steady_clock::now().time_since_epoch()).count();
}
#endif

// TFLite Micro Headers
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/schema/schema_generated.h"

static const char* TAG = "TRINETRA_MODEL";

ModelRunner::ModelRunner()
    : m_tensor_arena(nullptr)
    , m_model(nullptr)
    , m_interpreter(nullptr)
    , m_resolver(nullptr)
    , m_is_initialized(false) {}

ModelRunner::~ModelRunner() {
    if (m_interpreter) {
        delete m_interpreter;
        m_interpreter = nullptr;
    }
    if (m_resolver) {
        delete m_resolver;
        m_resolver = nullptr;
    }
    if (m_tensor_arena) {
        delete[] m_tensor_arena;
        m_tensor_arena = nullptr;
    }
}

bool ModelRunner::Init() {
    if (m_is_initialized) return true;

    printf("[MODEL] Initializing TRINETRA TFLite Micro Runtime...\n");

    // 1. Verify Model Data Array
    m_model = tflite::GetModel(g_trinetra_model_data);
    if (m_model->version() != TFLITE_SCHEMA_VERSION) {
        printf("[MODEL ERROR] Model schema version mismatch! Expected %d, got %ld\n",
               TFLITE_SCHEMA_VERSION, m_model->version());
        return false;
    }

    // 2. Allocate 16-byte aligned Tensor Arena
    m_tensor_arena = new (std::align_val_t(16)) uint8_t[TENSOR_ARENA_SIZE_BYTES];
    if (!m_tensor_arena) {
        printf("[MODEL ERROR] Failed to allocate tensor arena of size %d bytes!\n", TENSOR_ARENA_SIZE_BYTES);
        return false;
    }

    // 3. Register Minimal Operators (Strictly the 6 operators required by the DS-CNN)
    m_resolver = new tflite::MicroMutableOpResolver<6>();
    m_resolver->AddAveragePool2D();
    m_resolver->AddConv2D();
    m_resolver->AddDepthwiseConv2D();
    m_resolver->AddFullyConnected();
    m_resolver->AddRelu();
    m_resolver->AddSoftmax();

    // 4. Construct MicroInterpreter
    m_interpreter = new tflite::MicroInterpreter(
        m_model,
        *m_resolver,
        m_tensor_arena,
        TENSOR_ARENA_SIZE_BYTES
    );

    // 5. Allocate Tensors in Arena
    TfLiteStatus allocate_status = m_interpreter->AllocateTensors();
    if (allocate_status != kTfLiteOk) {
        printf("[MODEL ERROR] Tensor allocation in arena failed! Increase TENSOR_ARENA_SIZE_BYTES.\n");
        return false;
    }

    // 6. Verify Input/Output Tensor Properties
    TfLiteTensor* input = m_interpreter->input(0);
    TfLiteTensor* output = m_interpreter->output(0);

    if (input->type != kTfLiteInt8 || output->type != kTfLiteInt8) {
        printf("[MODEL WARNING] Model tensor types: input=%d, output=%d (Expected kTfLiteInt8=%d)\n",
               input->type, output->type, kTfLiteInt8);
    }

    m_is_initialized = true;
    printf("[MODEL] Model successfully allocated in arena.\n");
    return true;
}

bool ModelRunner::RunInference(const float* mfcc_features, float* out_probabilities, uint32_t* out_inference_us) {
    if (!m_is_initialized || !m_interpreter) return false;

    TfLiteTensor* input = m_interpreter->input(0);
    int8_t* input_data = input->data.int8;

    // Apply exact model input quantization: q = round(val / scale) + zero_point
    for (int i = 0; i < MFCC_TOTAL_ELEMENTS; ++i) {
        input_data[i] = QuantizeInput(mfcc_features[i]);
    }

    uint64_t start_time = esp_timer_get_time();
    TfLiteStatus invoke_status = m_interpreter->Invoke();
    uint64_t elapsed_us = esp_timer_get_time() - start_time;

    if (out_inference_us) {
        *out_inference_us = static_cast<uint32_t>(elapsed_us);
    }

    if (invoke_status != kTfLiteOk) {
        printf("[MODEL ERROR] Inference invocation failed!\n");
        return false;
    }

    // Dequantize output probabilities
    TfLiteTensor* output = m_interpreter->output(0);
    int8_t* output_data = output->data.int8;
    float sum_p = 0.0f;

    for (int c = 0; c < MODEL_NUM_CLASSES; ++c) {
        out_probabilities[c] = DequantizeOutput(output_data[c]);
        sum_p += out_probabilities[c];
    }

    // Normalize if needed
    if (sum_p > 0.0f) {
        for (int c = 0; c < MODEL_NUM_CLASSES; ++c) {
            out_probabilities[c] /= sum_p;
        }
    }

    return true;
}

bool ModelRunner::RunInferenceInt8(const int8_t* quantized_input, float* out_probabilities, uint32_t* out_inference_us) {
    if (!m_is_initialized || !m_interpreter) return false;

    TfLiteTensor* input = m_interpreter->input(0);
    std::memcpy(input->data.int8, quantized_input, MFCC_TOTAL_ELEMENTS * sizeof(int8_t));

    uint64_t start_time = esp_timer_get_time();
    TfLiteStatus invoke_status = m_interpreter->Invoke();
    uint64_t elapsed_us = esp_timer_get_time() - start_time;

    if (out_inference_us) {
        *out_inference_us = static_cast<uint32_t>(elapsed_us);
    }

    if (invoke_status != kTfLiteOk) {
        return false;
    }

    TfLiteTensor* output = m_interpreter->output(0);
    int8_t* output_data = output->data.int8;
    float sum_p = 0.0f;

    for (int c = 0; c < MODEL_NUM_CLASSES; ++c) {
        out_probabilities[c] = DequantizeOutput(output_data[c]);
        sum_p += out_probabilities[c];
    }

    if (sum_p > 0.0f) {
        for (int c = 0; c < MODEL_NUM_CLASSES; ++c) {
            out_probabilities[c] /= sum_p;
        }
    }

    return true;
}

size_t ModelRunner::GetArenaAllocatedBytes() const {
    return TENSOR_ARENA_SIZE_BYTES;
}

size_t ModelRunner::GetArenaUsedBytes() const {
    if (m_interpreter) {
        return m_interpreter->arena_used_bytes();
    }
    return 0;
}

size_t ModelRunner::GetArenaFreeBytes() const {
    size_t used = GetArenaUsedBytes();
    return (TENSOR_ARENA_SIZE_BYTES > used) ? (TENSOR_ARENA_SIZE_BYTES - used) : 0;
}

void ModelRunner::PrintDiagnostics() const {
    printf("\n============================================\n");
    printf("TRINETRA EDGE AI (ESP32-S3)\n");
    printf("============================================\n");
    printf("Model loaded:       %s\n", m_is_initialized ? "YES" : "NO");
    printf("Model size:         %u bytes (%.2f KB)\n", g_trinetra_model_data_size, g_trinetra_model_data_size / 1024.0f);
    printf("Tensor Arena Total: %zu bytes (%.2f KB)\n", GetArenaAllocatedBytes(), GetArenaAllocatedBytes() / 1024.0f);
    printf("Tensor Arena Used:  %zu bytes (%.2f KB)\n", GetArenaUsedBytes(), GetArenaUsedBytes() / 1024.0f);
    printf("Tensor Arena Free:  %zu bytes (%.2f KB)\n", GetArenaFreeBytes(), GetArenaFreeBytes() / 1024.0f);
    printf("\nInput shape:        1 x %d x %d x 1\n", MFCC_TIME_STEPS, MFCC_COEFFICIENTS);
    printf("Input type:         INT8\n");
    printf("Input scale:        %.8f\n", MODEL_INPUT_SCALE);
    printf("Input zero point:   %d\n", MODEL_INPUT_ZERO_POINT);
    printf("\nOutput shape:       1 x %d\n", MODEL_NUM_CLASSES);
    printf("Output type:        INT8\n");
    printf("Output scale:       %.8f\n", MODEL_OUTPUT_SCALE);
    printf("Output zero point:  %d\n", MODEL_OUTPUT_ZERO_POINT);
    printf("Operators:          AVERAGE_POOL_2D, CONV_2D, DEPTHWISE_CONV_2D, FULLY_CONNECTED, RELU, SOFTMAX\n");
    printf("============================================\n\n");
}
