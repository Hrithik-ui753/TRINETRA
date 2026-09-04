"""
TRINETRA Telemetry Schema with Attribute-Level Provenance & Source Metadata.
Supports both Physical Sensor telemetry, Simulated data, and Unavailable status.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
import datetime

@dataclass
class TelemetryField:
    """
    Every individual telemetry point contains value, unit, provenance source, and validity status.
    source: 'local_sensor' | 'simulation' | 'sensor' | 'firmware'
    status: 'valid' | 'simulated' | 'unavailable' | 'degraded'
    """
    value: Any
    unit: str = ""
    source: str = "simulation"
    status: str = "simulated"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": self.value,
            "unit": self.unit,
            "source": self.source,
            "status": self.status
        }

@dataclass
class SystemTelemetry:
    status: TelemetryField = field(default_factory=lambda: TelemetryField("NORMAL", "", "firmware", "valid"))
    uptime_seconds: TelemetryField = field(default_factory=lambda: TelemetryField(18452, "s", "firmware", "valid"))
    free_heap_bytes: TelemetryField = field(default_factory=lambda: TelemetryField(410000, "bytes", "firmware", "valid"))
    cpu_usage_percent: TelemetryField = field(default_factory=lambda: TelemetryField(31.0, "%", "firmware", "valid"))
    cpu_temperature_c: TelemetryField = field(default_factory=lambda: TelemetryField(42.3, "C", "local_sensor", "simulated"))
    firmware_version: TelemetryField = field(default_factory=lambda: TelemetryField("1.0.0", "", "firmware", "valid"))
    last_reboot: TelemetryField = field(default_factory=lambda: TelemetryField("2026-09-01T08:00:00Z", "", "firmware", "valid"))

@dataclass
class CommunicationTelemetry:
    wifi_status: TelemetryField = field(default_factory=lambda: TelemetryField("CONNECTED", "", "firmware", "valid"))
    signal_strength_dbm: TelemetryField = field(default_factory=lambda: TelemetryField(-61, "dBm", "local_sensor", "simulated"))
    server_status: TelemetryField = field(default_factory=lambda: TelemetryField("CONNECTED", "", "firmware", "valid"))
    last_communication_seconds: TelemetryField = field(default_factory=lambda: TelemetryField(2, "s", "firmware", "valid"))
    packet_loss_percent: TelemetryField = field(default_factory=lambda: TelemetryField(0.2, "%", "firmware", "valid"))
    communication_errors: TelemetryField = field(default_factory=lambda: TelemetryField(0, "", "firmware", "valid"))

@dataclass
class AudioTelemetry:
    mic_1: TelemetryField = field(default_factory=lambda: TelemetryField("ACTIVE", "", "local_sensor", "valid"))
    mic_2: TelemetryField = field(default_factory=lambda: TelemetryField("ACTIVE", "", "local_sensor", "valid"))
    sample_rate_hz: TelemetryField = field(default_factory=lambda: TelemetryField(16000, "Hz", "firmware", "valid"))
    channels: TelemetryField = field(default_factory=lambda: TelemetryField(2, "channels", "firmware", "valid"))
    vad_status: TelemetryField = field(default_factory=lambda: TelemetryField("IDLE", "", "firmware", "valid"))
    wake_word_status: TelemetryField = field(default_factory=lambda: TelemetryField("READY", "", "firmware", "valid"))
    last_wake_confidence: TelemetryField = field(default_factory=lambda: TelemetryField(0.91, "", "firmware", "valid"))

@dataclass
class MLTelemetry:
    model: TelemetryField = field(default_factory=lambda: TelemetryField("DS-CNN INT8", "", "firmware", "valid"))
    model_size_bytes: TelemetryField = field(default_factory=lambda: TelemetryField(13104, "bytes", "firmware", "valid"))
    mfcc_latency_ms: TelemetryField = field(default_factory=lambda: TelemetryField(2.636, "ms", "firmware", "valid"))
    inference_latency_ms: TelemetryField = field(default_factory=lambda: TelemetryField(0.146, "ms", "firmware", "valid"))
    total_compute_latency_ms: TelemetryField = field(default_factory=lambda: TelemetryField(2.783, "ms", "firmware", "valid"))
    wake_threshold: TelemetryField = field(default_factory=lambda: TelemetryField(0.85, "", "firmware", "valid"))
    acwe: TelemetryField = field(default_factory=lambda: TelemetryField("2-of-3", "", "firmware", "valid"))
    status: TelemetryField = field(default_factory=lambda: TelemetryField("READY", "", "firmware", "valid"))

@dataclass
class EnvironmentTelemetry:
    temperature_c: TelemetryField = field(default_factory=lambda: TelemetryField(28.4, "C", "local_sensor", "simulated"))
    humidity_percent: TelemetryField = field(default_factory=lambda: TelemetryField(54.2, "%", "local_sensor", "simulated"))
    pressure_kpa: TelemetryField = field(default_factory=lambda: TelemetryField(None, "kPa", "sensor", "unavailable"))

@dataclass
class HardwareTelemetry:
    door: TelemetryField = field(default_factory=lambda: TelemetryField("CLOSED", "", "local_sensor", "simulated"))
    hatch: TelemetryField = field(default_factory=lambda: TelemetryField("LOCKED", "", "local_sensor", "simulated"))
    vibration: TelemetryField = field(default_factory=lambda: TelemetryField("NORMAL", "", "local_sensor", "simulated"))

@dataclass
class PowerTelemetry:
    voltage_v: TelemetryField = field(default_factory=lambda: TelemetryField(5.02, "V", "local_sensor", "simulated"))
    current_ma: TelemetryField = field(default_factory=lambda: TelemetryField(620, "mA", "local_sensor", "simulated"))
    power_w: TelemetryField = field(default_factory=lambda: TelemetryField(3.11, "W", "local_sensor", "simulated"))
    battery_percent: TelemetryField = field(default_factory=lambda: TelemetryField(78, "%", "local_sensor", "simulated"))
    charging: TelemetryField = field(default_factory=lambda: TelemetryField(True, "", "local_sensor", "simulated"))
    status: TelemetryField = field(default_factory=lambda: TelemetryField("NORMAL", "", "local_sensor", "simulated"))

@dataclass
class TelemetryEvent:
    event: str
    timestamp: str = field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

@dataclass
class MachineTelemetry:
    device_id: str
    timestamp: str = field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    system: SystemTelemetry = field(default_factory=SystemTelemetry)
    communication: CommunicationTelemetry = field(default_factory=CommunicationTelemetry)
    audio: AudioTelemetry = field(default_factory=AudioTelemetry)
    ml: MLTelemetry = field(default_factory=MLTelemetry)
    environment: EnvironmentTelemetry = field(default_factory=EnvironmentTelemetry)
    hardware: HardwareTelemetry = field(default_factory=HardwareTelemetry)
    power: PowerTelemetry = field(default_factory=PowerTelemetry)
    faults: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    events: List[TelemetryEvent] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "device_id": self.device_id,
            "timestamp": self.timestamp,
            "system": {k: getattr(self.system, k).to_dict() for k in self.system.__dict__},
            "communication": {k: getattr(self.communication, k).to_dict() for k in self.communication.__dict__},
            "audio": {k: getattr(self.audio, k).to_dict() for k in self.audio.__dict__},
            "ml": {k: getattr(self.ml, k).to_dict() for k in self.ml.__dict__},
            "environment": {k: getattr(self.environment, k).to_dict() for k in self.environment.__dict__},
            "hardware": {k: getattr(self.hardware, k).to_dict() for k in self.hardware.__dict__},
            "power": {k: getattr(self.power, k).to_dict() for k in self.power.__dict__},
            "faults": list(self.faults),
            "warnings": list(self.warnings),
            "events": [{"event": e.event, "timestamp": e.timestamp} for e in self.events]
        }
