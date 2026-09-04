"""
Predefined Profiles for TRINETRA Multi-Machine Demonstration (Stage 9A).
Provides isolated, distinct telemetry states for TRINETRA-001, TRINETRA-002, and TRINETRA-003.
"""

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
    TelemetryEvent
)

def create_trinetra_001() -> MachineTelemetry:
    """
    TRINETRA-001: Nominal healthy edge device
    Temp: 28.4 C, Humidity: 54.2%, Door: closed, WiFi: connected, Voltage: 5.02 V
    """
    m = MachineTelemetry(device_id="TRINETRA-001")
    # System
    m.system.status = TelemetryField("normal", "", "firmware", "valid")
    m.system.uptime_seconds = TelemetryField(18452, "s", "firmware", "valid")
    m.system.free_heap_bytes = TelemetryField(410000, "bytes", "firmware", "valid")
    m.system.cpu_usage_percent = TelemetryField(28.5, "%", "firmware", "valid")
    m.system.cpu_temperature_c = TelemetryField(42.3, "C", "local_sensor", "simulated")
    # Power
    m.power.charging = TelemetryField(True, "", "local_sensor", "simulated")
    m.power.battery_percent = TelemetryField(78, "%", "local_sensor", "simulated")
    m.power.voltage_v = TelemetryField(5.02, "V", "local_sensor", "simulated")
    m.power.current_ma = TelemetryField(620, "mA", "local_sensor", "simulated")
    m.power.status = TelemetryField("normal", "", "local_sensor", "simulated")
    # Environment / Sensors
    m.environment.temperature_c = TelemetryField(28.4, "C", "local_sensor", "simulated")
    m.environment.humidity_percent = TelemetryField(54.2, "%", "local_sensor", "simulated")
    m.environment.pressure_kpa = TelemetryField(None, "kPa", "sensor", "unavailable")
    # Hardware
    m.hardware.door = TelemetryField("closed", "", "local_sensor", "simulated")
    m.hardware.hatch = TelemetryField("locked", "", "local_sensor", "simulated")
    m.hardware.vibration = TelemetryField("normal", "", "local_sensor", "simulated")
    # Communication
    m.communication.wifi_status = TelemetryField("connected", "", "firmware", "valid")
    m.communication.server_status = TelemetryField("connected", "", "firmware", "valid")
    m.communication.signal_strength_dbm = TelemetryField(-61, "dBm", "local_sensor", "simulated")
    # Audio
    m.audio.mic_1 = TelemetryField("active", "", "local_sensor", "valid")
    m.audio.mic_2 = TelemetryField("active", "", "local_sensor", "valid")
    m.audio.sample_rate_hz = TelemetryField(16000, "Hz", "firmware", "valid")
    m.audio.last_wake_confidence = TelemetryField(0.962, "", "firmware", "valid")
    # ML
    m.ml.mfcc_latency_ms = TelemetryField(2.636, "ms", "firmware", "valid")
    m.ml.inference_latency_ms = TelemetryField(0.146, "ms", "firmware", "valid")
    m.ml.total_compute_latency_ms = TelemetryField(2.783, "ms", "firmware", "valid")
    m.ml.wake_threshold = TelemetryField(0.85, "", "firmware", "valid")
    # Faults
    m.faults = []
    m.warnings = []
    m.events = [
        TelemetryEvent("System initialized in normal operating state"),
        TelemetryEvent("Wake word detected (Confidence: 0.962)")
    ]
    return m

def create_trinetra_002() -> MachineTelemetry:
    """
    TRINETRA-002: Warm machine with open door and mic fault
    Temp: 34.7 C, Humidity: 61.3%, Door: open, WiFi: connected, Voltage: 4.91 V
    """
    m = MachineTelemetry(device_id="TRINETRA-002")
    # System
    m.system.status = TelemetryField("warning", "", "firmware", "valid")
    m.system.uptime_seconds = TelemetryField(4210, "s", "firmware", "valid")
    m.system.free_heap_bytes = TelemetryField(385000, "bytes", "firmware", "valid")
    m.system.cpu_usage_percent = TelemetryField(45.2, "%", "firmware", "valid")
    m.system.cpu_temperature_c = TelemetryField(48.7, "C", "local_sensor", "simulated")
    # Power
    m.power.charging = TelemetryField(False, "", "local_sensor", "simulated")
    m.power.battery_percent = TelemetryField(42, "%", "local_sensor", "simulated")
    m.power.voltage_v = TelemetryField(4.91, "V", "local_sensor", "simulated")
    m.power.current_ma = TelemetryField(740, "mA", "local_sensor", "simulated")
    m.power.status = TelemetryField("discharging", "", "local_sensor", "simulated")
    # Environment / Sensors
    m.environment.temperature_c = TelemetryField(34.7, "C", "local_sensor", "simulated")
    m.environment.humidity_percent = TelemetryField(61.3, "%", "local_sensor", "simulated")
    m.environment.pressure_kpa = TelemetryField(None, "kPa", "sensor", "unavailable")
    # Hardware
    m.hardware.door = TelemetryField("open", "", "local_sensor", "simulated")
    m.hardware.hatch = TelemetryField("unlocked", "", "local_sensor", "simulated")
    m.hardware.vibration = TelemetryField("elevated", "", "local_sensor", "simulated")
    # Communication
    m.communication.wifi_status = TelemetryField("connected", "", "firmware", "valid")
    m.communication.server_status = TelemetryField("connected", "", "firmware", "valid")
    m.communication.signal_strength_dbm = TelemetryField(-74, "dBm", "local_sensor", "simulated")
    # Audio
    m.audio.mic_1 = TelemetryField("active", "", "local_sensor", "valid")
    m.audio.mic_2 = TelemetryField("active", "", "local_sensor", "valid")
    m.audio.sample_rate_hz = TelemetryField(16000, "Hz", "firmware", "valid")
    m.audio.last_wake_confidence = TelemetryField(0.887, "", "firmware", "valid")
    # ML
    m.ml.mfcc_latency_ms = TelemetryField(2.636, "ms", "firmware", "valid")
    m.ml.inference_latency_ms = TelemetryField(0.146, "ms", "firmware", "valid")
    m.ml.total_compute_latency_ms = TelemetryField(2.783, "ms", "firmware", "valid")
    m.ml.wake_threshold = TelemetryField(0.85, "", "firmware", "valid")
    # Faults & Warnings
    m.faults = ["MIC_02 low signal"]
    m.warnings = ["Microphone 2 is reporting a low signal", "Chamber door is currently OPEN"]
    m.events = [
        TelemetryEvent("Warning logged: Microphone 2 signal degradation"),
        TelemetryEvent("Hardware alert: Chamber door OPEN")
    ]
    return m

def create_trinetra_003() -> MachineTelemetry:
    """
    TRINETRA-003: Cold idle machine with WiFi disconnected
    Temp: 24.8 C, Humidity: 47.5%, Door: closed, WiFi: disconnected, Voltage: 4.76 V
    """
    m = MachineTelemetry(device_id="TRINETRA-003")
    # System
    m.system.status = TelemetryField("normal", "", "firmware", "valid")
    m.system.uptime_seconds = TelemetryField(94200, "s", "firmware", "valid")
    m.system.free_heap_bytes = TelemetryField(446000, "bytes", "firmware", "valid")
    m.system.cpu_usage_percent = TelemetryField(19.8, "%", "firmware", "valid")
    m.system.cpu_temperature_c = TelemetryField(38.2, "C", "local_sensor", "simulated")
    # Power
    m.power.charging = TelemetryField(True, "", "local_sensor", "simulated")
    m.power.battery_percent = TelemetryField(91, "%", "local_sensor", "simulated")
    m.power.voltage_v = TelemetryField(4.76, "V", "local_sensor", "simulated")
    m.power.current_ma = TelemetryField(410, "mA", "local_sensor", "simulated")
    m.power.status = TelemetryField("normal", "", "local_sensor", "simulated")
    # Environment / Sensors
    m.environment.temperature_c = TelemetryField(24.8, "C", "local_sensor", "simulated")
    m.environment.humidity_percent = TelemetryField(47.5, "%", "local_sensor", "simulated")
    m.environment.pressure_kpa = TelemetryField(None, "kPa", "sensor", "unavailable")
    # Hardware
    m.hardware.door = TelemetryField("closed", "", "local_sensor", "simulated")
    m.hardware.hatch = TelemetryField("locked", "", "local_sensor", "simulated")
    m.hardware.vibration = TelemetryField("normal", "", "local_sensor", "simulated")
    # Communication
    m.communication.wifi_status = TelemetryField("disconnected", "", "firmware", "valid")
    m.communication.server_status = TelemetryField("disconnected", "", "firmware", "valid")
    m.communication.signal_strength_dbm = TelemetryField(-95, "dBm", "local_sensor", "simulated")
    # Audio
    m.audio.mic_1 = TelemetryField("active", "", "local_sensor", "valid")
    m.audio.mic_2 = TelemetryField("active", "", "local_sensor", "valid")
    m.audio.sample_rate_hz = TelemetryField(16000, "Hz", "firmware", "valid")
    m.audio.last_wake_confidence = TelemetryField(0.945, "", "firmware", "valid")
    # ML
    m.ml.mfcc_latency_ms = TelemetryField(2.636, "ms", "firmware", "valid")
    m.ml.inference_latency_ms = TelemetryField(0.146, "ms", "firmware", "valid")
    m.ml.total_compute_latency_ms = TelemetryField(2.783, "ms", "firmware", "valid")
    m.ml.wake_threshold = TelemetryField(0.85, "", "firmware", "valid")
    # Faults
    m.faults = []
    m.warnings = []
    m.events = [
        TelemetryEvent("System operating in low-power standalone mode (Wi-Fi disconnected)")
    ]
    return m
