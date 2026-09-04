"""TRINETRA ML Quantization Package."""

from TRINETRA_ML.quantization.inspect_model import inspect_tflite_model
from TRINETRA_ML.quantization.evaluate_tflite import TFLiteEvaluator

try:
    from TRINETRA_ML.quantization.representative import build_representative_dataset, get_representative_dataset_gen
    from TRINETRA_ML.quantization.quantize import convert_to_float32_tflite, convert_to_int8_tflite
except ImportError:
    pass

__all__ = [
    "inspect_tflite_model",
    "TFLiteEvaluator",
]
