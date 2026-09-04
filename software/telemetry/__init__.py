"""TRINETRA Telemetry Subsystem."""

from .telemetry_schema import (
    MachineTelemetry,
    SystemTelemetry,
    CommunicationTelemetry,
    AudioTelemetry,
    MLTelemetry,
    EnvironmentTelemetry,
    HardwareTelemetry,
    PowerTelemetry,
    TelemetryField,
    TelemetryEvent,
)
from .device_registry import DeviceRegistry
from .telemetry_manager import TelemetryManager
from .simulated_devices import create_trinetra_001, create_trinetra_002, create_trinetra_003

__all__ = [
    "MachineTelemetry",
    "SystemTelemetry",
    "CommunicationTelemetry",
    "AudioTelemetry",
    "MLTelemetry",
    "EnvironmentTelemetry",
    "HardwareTelemetry",
    "PowerTelemetry",
    "TelemetryField",
    "TelemetryEvent",
    "DeviceRegistry",
    "TelemetryManager",
    "create_trinetra_001",
    "create_trinetra_002",
    "create_trinetra_003",
]
