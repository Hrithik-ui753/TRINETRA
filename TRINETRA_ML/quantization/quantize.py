"""TRINETRA ML - TFLite Post-Training Quantization Module.

Converts Keras model to Float32 TFLite and Full Integer INT8 TFLite with strict TFLite Micro operator constraints.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Callable, Tuple
import numpy as np

# Ensure TensorFlow backend is configured before importing keras/tensorflow
os.environ["KERAS_BACKEND"] = "tensorflow"
import keras
import tensorflow as tf


def convert_to_float32_tflite(
    keras_model_path: str | Path = "TRINETRA_ML/models/optimized_ds_cnn.keras",
    output_tflite_path: str | Path = "TRINETRA_ML/models/trinetra_ds_cnn_float32.tflite",
) -> Tuple[bytes, dict]:
    """Convert Keras model to Float32 TFLite."""
    keras_model_path = Path(keras_model_path)
    output_tflite_path = Path(output_tflite_path)
    output_tflite_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"[CONVERT-F32] Loading Keras model: {keras_model_path}...")
    model = keras.models.load_model(keras_model_path, compile=False)

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_f32_bytes = converter.convert()

    with open(output_tflite_path, "wb") as f:
        f.write(tflite_f32_bytes)

    file_size_kb = len(tflite_f32_bytes) / 1024.0
    print(f"[CONVERT-F32] Float32 TFLite saved -> {output_tflite_path} ({len(tflite_f32_bytes)} bytes / {file_size_kb:.2f} KB)")

    meta = {
        "file_path": str(output_tflite_path),
        "size_bytes": len(tflite_f32_bytes),
        "size_kb": file_size_kb,
    }
    return tflite_f32_bytes, meta


def convert_to_int8_tflite(
    keras_model_path: str | Path = "TRINETRA_ML/models/optimized_ds_cnn.keras",
    representative_gen: Callable = None,
    output_tflite_path: str | Path = "TRINETRA_ML/models/trinetra_ds_cnn_int8.tflite",
) -> Tuple[bytes, dict]:
    """Convert Keras model to Full Integer INT8 TFLite with strict INT8 I/O."""
    keras_model_path = Path(keras_model_path)
    output_tflite_path = Path(output_tflite_path)
    output_tflite_path.parent.mkdir(parents=True, exist_ok=True)

    if representative_gen is None:
        raise ValueError("representative_gen must be provided for full integer INT8 quantization.")

    print(f"[CONVERT-INT8] Loading Keras model: {keras_model_path}...")
    model = keras.models.load_model(keras_model_path, compile=False)

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_gen
    
    # Enforce full integer quantization (strictly builtins INT8, no float fallback)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    try:
        tflite_int8_bytes = converter.convert()
    except Exception as e:
        print(f"[CONVERT-INT8 ERROR] Conversion failed: {e}")
        raise RuntimeError(f"Full Integer INT8 quantization failed. Operator error: {e}") from e

    with open(output_tflite_path, "wb") as f:
        f.write(tflite_int8_bytes)

    file_size_kb = len(tflite_int8_bytes) / 1024.0
    print(f"[CONVERT-INT8] INT8 TFLite saved -> {output_tflite_path} ({len(tflite_int8_bytes)} bytes / {file_size_kb:.2f} KB)")

    meta = {
        "file_path": str(output_tflite_path),
        "size_bytes": len(tflite_int8_bytes),
        "size_kb": file_size_kb,
    }
    return tflite_int8_bytes, meta
