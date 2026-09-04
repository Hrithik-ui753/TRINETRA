"""
TRINETRA ML - DS-CNN Model Architecture
Compact, Depthwise-Separable CNN designed for low-latency wake-word detection on edge devices.
"""

import os
import io
import json
from typing import Dict, Any, Tuple
import numpy as np
os.environ["KERAS_BACKEND"] = "torch"
import keras
from keras import layers

def build_dscnn_model(
    input_shape: Tuple[int, int, int] = (97, 13, 1),
    num_classes: int = 3,
    initial_filters: int = 16,
    ds_filters: Tuple[int, ...] = (32, 32),
    kernel_size: Tuple[int, int] = (3, 3),
    dropout_rate: float = 0.1
) -> keras.Model:
    """
    Builds a compact Depthwise-Separable CNN for keyword spotting.
    """
    inputs = layers.Input(shape=input_shape, name="mfcc_input")

    # Initial standard Conv2D
    x = layers.Conv2D(
        filters=initial_filters,
        kernel_size=kernel_size,
        padding="same",
        use_bias=False,
        name="initial_conv2d"
    )(inputs)
    x = layers.BatchNormalization(name="initial_bn")(x)
    x = layers.ReLU(name="initial_relu")(x)

    # Depthwise Separable Blocks
    for i, filters in enumerate(ds_filters):
        block_id = i + 1
        # Depthwise Conv
        x = layers.DepthwiseConv2D(
            kernel_size=kernel_size,
            padding="same",
            use_bias=False,
            name=f"ds_block{block_id}_dw_conv"
        )(x)
        x = layers.BatchNormalization(name=f"ds_block{block_id}_dw_bn")(x)
        x = layers.ReLU(name=f"ds_block{block_id}_dw_relu")(x)

        # Pointwise Conv (1x1)
        x = layers.Conv2D(
            filters=filters,
            kernel_size=(1, 1),
            padding="same",
            use_bias=False,
            name=f"ds_block{block_id}_pw_conv"
        )(x)
        x = layers.BatchNormalization(name=f"ds_block{block_id}_pw_bn")(x)
        x = layers.ReLU(name=f"ds_block{block_id}_pw_relu")(x)

    # Pooling & Classification Head
    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    if dropout_rate > 0.0:
        x = layers.Dropout(dropout_rate, name="classifier_dropout")(x)
        
    outputs = layers.Dense(num_classes, activation="softmax", name="class_probs")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="TRINETRA_DS_CNN_Baseline")
    return model

def compute_model_macs(model: keras.Model) -> int:
    """
    Computes approximate MACs (Multiply-Accumulate operations) for the DS-CNN model.
    """
    total_macs = 0
    # Process layers
    for layer in model.layers:
        if isinstance(layer, layers.Conv2D):
            # output_h * output_w * (k_h * k_w * in_c) * out_c
            out_shape = layer.output.shape
            if len(out_shape) == 4:
                _, h, w, out_c = out_shape
                k_h, k_w = layer.kernel_size
                in_c = layer.input.shape[-1]
                macs = h * w * (k_h * k_w * in_c) * out_c
                total_macs += macs
        elif isinstance(layer, layers.DepthwiseConv2D):
            out_shape = layer.output.shape
            if len(out_shape) == 4:
                _, h, w, out_c = out_shape
                k_h, k_w = layer.kernel_size
                macs = h * w * (k_h * k_w) * out_c
                total_macs += macs
        elif isinstance(layer, layers.Dense):
            in_f = layer.input.shape[-1]
            out_f = layer.output.shape[-1]
            total_macs += (in_f * out_f)
    return total_macs

def report_model_resources(
    model: keras.Model,
    summary_txt_path: str = "TRINETRA_ML/reports/model_summary.txt",
    config_json_path: str = "TRINETRA_ML/reports/model_config.json"
) -> Dict[str, Any]:
    """
    Generates detailed parameter counts, theoretical weight sizes, and MACs report.
    """
    os.makedirs(os.path.dirname(summary_txt_path), exist_ok=True)
    os.makedirs(os.path.dirname(config_json_path), exist_ok=True)

    # Capture string summary
    stream = io.StringIO()
    model.summary(print_fn=lambda x: stream.write(x + "\n"))
    summary_str = stream.getvalue()

    total_params = model.count_params()
    trainable_params = sum(int(np.prod(p.shape)) for p in model.trainable_weights)
    non_trainable_params = sum(int(np.prod(p.shape)) for p in model.non_trainable_weights)
    
    float32_size_kb = (total_params * 4) / 1024.0
    int8_size_kb = (total_params * 1) / 1024.0
    macs = compute_model_macs(model)

    resource_data = {
        "model_name": model.name,
        "input_shape": list(model.input.shape[1:]),
        "output_shape": list(model.output.shape[1:]),
        "total_parameters": int(total_params),
        "trainable_parameters": int(trainable_params),
        "non_trainable_parameters": int(non_trainable_params),
        "approx_float32_weight_size_kb": round(float32_size_kb, 2),
        "approx_int8_weight_size_kb": round(int8_size_kb, 2),
        "approx_macs": int(macs),
        "architecture_summary": {
            "initial_filters": 16,
            "ds_blocks": [32, 32],
            "kernel_size": [3, 3],
            "activation": "ReLU",
            "classifier": "Dense(3, Softmax)"
        }
    }

    # Write summary text
    with open(summary_txt_path, "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("TRINETRA DS-CNN MODEL RESOURCE & ARCHITECTURE SUMMARY\n")
        f.write("=" * 60 + "\n\n")
        f.write(summary_str + "\n\n")
        f.write("-" * 60 + "\n")
        f.write(f"Input Tensor Shape:         {model.input.shape[1:]}\n")
        f.write(f"Output Tensor Shape:        {model.output.shape[1:]}\n")
        f.write(f"Total Parameters:           {total_params:,}\n")
        f.write(f"Trainable Parameters:       {trainable_params:,}\n")
        f.write(f"Non-Trainable Parameters:   {non_trainable_params:,}\n")
        f.write(f"Approx. Float32 Weight:     {float32_size_kb:.2f} KB\n")
        f.write(f"Approx. INT8 Weight:        {int8_size_kb:.2f} KB\n")
        f.write(f"Estimated Inference MACs:   {macs:,} operations\n")
        f.write("=" * 60 + "\n")

    # Write config JSON
    with open(config_json_path, "w", encoding="utf-8") as f:
        json.dump(resource_data, f, indent=2)

    print(f"[MODEL] Summary exported -> {summary_txt_path}")
    print(f"[MODEL] Config exported  -> {config_json_path}")

    return resource_data

if __name__ == "__main__":
    m = build_dscnn_model()
    report_model_resources(m)
