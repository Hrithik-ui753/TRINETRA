"""
TRINETRA Telemetry Manager (Stage 9B).
Source of Truth for Multi-Machine Telemetry & Real ESP32 Ingestion.
Enforces strict device isolation, schema validation, freshness/stale tracking, and provenance.
"""

import time
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
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

class TelemetryManager:
    def __init__(self, registry: Optional[DeviceRegistry] = None, default_device_id: str = "TRINETRA-001"):
        self.registry = registry or DeviceRegistry()
        self._selected_device_id: Optional[str] = None
        self._last_received_timestamps: Dict[str, float] = {}
        self.select_device(default_device_id)

    # ─── Standard Stage 9A/9B Lifecycle APIs ───

    def register_device(self, telemetry: MachineTelemetry) -> None:
        """Registers a new device into the registry."""
        self.registry.register_device(telemetry)

    def select_device(self, device_id: str) -> bool:
        """
        Dynamically binds selected machine context.
        Instant cache purge and context isolation.
        """
        if not self.registry.has_device(device_id):
            raise ValueError(f"Device '{device_id}' is not registered in DeviceRegistry.")
        self._selected_device_id = device_id
        return True

    def set_active_device(self, device_id: str) -> bool:
        """Alias for select_device."""
        return self.select_device(device_id)

    def set_selected_device(self, device_id: str) -> bool:
        """Alias for select_device."""
        return self.select_device(device_id)

    def get_selected_device(self) -> str:
        """Returns currently selected device ID."""
        if not self._selected_device_id:
            raise RuntimeError("No active TRINETRA device context selected.")
        return self._selected_device_id

    def get_active_device(self) -> str:
        """Alias for get_selected_device."""
        return self.get_selected_device()

    def update_telemetry(self, device_id: str, telemetry: MachineTelemetry) -> None:
        """Updates telemetry for a specific registered device."""
        self.registry.update_device_telemetry(device_id, telemetry)
        self._last_received_timestamps[device_id] = time.time()

    def get_telemetry(self, device_id: Optional[str] = None) -> MachineTelemetry:
        """
        Retrieves telemetry for the specified or currently selected device.
        Never searches another device if a field is missing.
        """
        target_id = device_id or self.get_selected_device()
        telemetry = self.registry.get_device(target_id)
        if not telemetry:
            raise RuntimeError(f"Telemetry unavailable for device '{target_id}'.")
        return telemetry

    def get_active_device_telemetry(self) -> MachineTelemetry:
        """Alias for get_telemetry()."""
        return self.get_telemetry()

    def clear_device_context(self) -> None:
        """Clears selected device context."""
        self._selected_device_id = None

    def validate_telemetry(self, telemetry: MachineTelemetry) -> bool:
        """Validates that telemetry structure conforms to schema."""
        return bool(telemetry.device_id and telemetry.timestamp)

    # ─── Stage 9B Ingestion & Freshness APIs ───

    def validate_ingestion_payload(self, payload: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validates raw telemetry JSON ingested from ESP32 or external transport.
        Rejects malformed telemetry, invalid data types, or missing IDs.
        """
        if not isinstance(payload, dict):
            return False, "Payload must be a JSON object"

        if "device_id" not in payload or not isinstance(payload["device_id"], str) or not payload["device_id"].strip():
            return False, "Missing or invalid mandatory 'device_id'"

        # System type checks if present
        if "system" in payload:
            sys = payload["system"]
            if not isinstance(sys, dict):
                return False, "Field 'system' must be an object"
            if "uptime" in sys and sys["uptime"] is not None and not isinstance(sys["uptime"], (int, float)):
                return False, "Field 'system.uptime' must be numerical"
            if "free_heap" in sys and sys["free_heap"] is not None and not isinstance(sys["free_heap"], int):
                return False, "Field 'system.free_heap' must be an integer"

        # Sensors type checks if present
        if "sensors" in payload:
            sens = payload["sensors"]
            if not isinstance(sens, dict):
                return False, "Field 'sensors' must be an object"
            if "temperature" in sens and sens["temperature"] is not None and not isinstance(sens["temperature"], (int, float)):
                return False, "Field 'sensors.temperature' must be a float or null"

        # Power type checks if present
        if "power" in payload:
            pwr = payload["power"]
            if not isinstance(pwr, dict):
                return False, "Field 'power' must be an object"
            if "voltage" in pwr and pwr["voltage"] is not None and not isinstance(pwr["voltage"], (int, float)):
                return False, "Field 'power.voltage' must be numerical or null"

        return True, "OK"

    def ingest_telemetry_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests and validates incoming telemetry packet from ESP32.
        Updates device state with source='esp32' and records freshness timestamp.
        """
        is_valid, reason = self.validate_ingestion_payload(payload)
        if not is_valid:
            raise ValueError(f"Telemetry Ingestion Rejected: {reason}")

        dev_id = payload["device_id"]
        source = payload.get("source", "esp32")
        status = payload.get("status", "valid")

        # Retrieve or construct device telemetry
        if self.registry.has_device(dev_id):
            m = self.registry.get_device(dev_id)
        else:
            m = MachineTelemetry(device_id=dev_id)
            self.registry.register_device(m)

        m.device_id = dev_id
        m.timestamp = payload.get("timestamp", datetime.now(timezone.utc).isoformat())

        # Update System
        if "system" in payload:
            sys = payload["system"]
            if "uptime" in sys and sys["uptime"] is not None:
                m.system.uptime_seconds = TelemetryField(sys["uptime"], "s", source, status)
            if "free_heap" in sys and sys["free_heap"] is not None:
                m.system.free_heap_bytes = TelemetryField(sys["free_heap"], "bytes", source, status)
            if "cpu_temperature" in sys:
                v = sys["cpu_temperature"]
                m.system.cpu_temperature_c = TelemetryField(v, "C", source, "valid" if v is not None else "unavailable")
            if "status" in sys and sys["status"]:
                m.system.status = TelemetryField(sys["status"], "", source, status)

        # Update Communication
        if "communication" in payload:
            comm = payload["communication"]
            if "wifi" in comm:
                m.communication.wifi_status = TelemetryField(comm["wifi"], "", source, status)
            if "server" in comm:
                m.communication.server_status = TelemetryField(comm["server"], "", source, status)
            if "signal_strength" in comm and comm["signal_strength"] is not None:
                m.communication.signal_strength_dbm = TelemetryField(comm["signal_strength"], "dBm", source, status)

        # Update Audio
        if "audio" in payload:
            aud = payload["audio"]
            if "mic_1" in aud:
                m.audio.mic_1 = TelemetryField(aud["mic_1"], "", source, status)
            if "mic_2" in aud:
                m.audio.mic_2 = TelemetryField(aud["mic_2"], "", source, status)
            if "sample_rate" in aud:
                m.audio.sample_rate_hz = TelemetryField(aud["sample_rate"], "Hz", source, status)

        # Update ML
        if "ml" in payload:
            ml_data = payload["ml"]
            if "mfcc_latency_ms" in ml_data:
                m.ml.mfcc_latency_ms = TelemetryField(ml_data["mfcc_latency_ms"], "ms", source, status)
            if "inference_latency_ms" in ml_data:
                m.ml.inference_latency_ms = TelemetryField(ml_data["inference_latency_ms"], "ms", source, status)
            if "wake_threshold" in ml_data:
                m.ml.wake_threshold = TelemetryField(ml_data["wake_threshold"], "", source, status)

        # Update Sensors
        if "sensors" in payload:
            sens = payload["sensors"]
            if "temperature" in sens:
                v = sens["temperature"]
                m.environment.temperature_c = TelemetryField(v, "C", source, "valid" if v is not None else "unavailable")
            if "humidity" in sens:
                v = sens["humidity"]
                m.environment.humidity_percent = TelemetryField(v, "%", source, "valid" if v is not None else "unavailable")
            if "door" in sens:
                v = sens["door"]
                m.hardware.door = TelemetryField(v, "", source, "valid" if v not in [None, "unknown"] else "unavailable")

        # Update Power
        if "power" in payload:
            pwr = payload["power"]
            if "voltage" in pwr:
                v = pwr["voltage"]
                m.power.voltage_v = TelemetryField(v, "V", source, "valid" if v is not None else "unavailable")
            if "status" in pwr:
                m.power.status = TelemetryField(pwr["status"], "", source, status)

        # Update Faults
        if "faults" in payload and isinstance(payload["faults"], list):
            m.faults = list(payload["faults"])

        # Update registry & timestamp
        self.update_telemetry(dev_id, m)

        return {"status": "accepted", "device_id": dev_id, "source": source}

    def check_freshness(self, device_id: Optional[str] = None, max_age_seconds: float = 15.0) -> bool:
        """
        Returns True if telemetry was received within max_age_seconds, False if stale/disconnected.
        """
        dev_id = device_id or self.get_selected_device()
        last_t = self._last_received_timestamps.get(dev_id)
        if last_t is None:
            # Default to fresh for simulated unless explicitly marked stale
            t = self.get_telemetry(dev_id)
            return t.system.status.status != "stale"
        return (time.time() - last_t) <= max_age_seconds

    def is_stale(self, device_id: Optional[str] = None, max_age_seconds: float = 15.0) -> bool:
        return not self.check_freshness(device_id, max_age_seconds)

    def set_device_stale(self, device_id: str) -> None:
        """Marks device telemetry state as STALE."""
        t = self.get_telemetry(device_id)
        t.system.status.status = "stale"
        t.environment.temperature_c.status = "stale"
        self._last_received_timestamps[device_id] = 0.0

    def set_device_disconnected(self, device_id: str) -> None:
        """Marks device as DISCONNECTED."""
        t = self.get_telemetry(device_id)
        t.system.status.value = "disconnected"
        t.system.status.status = "unavailable"
        t.communication.wifi_status = TelemetryField("disconnected", "", "esp32", "unavailable")
        t.communication.server_status = TelemetryField("disconnected", "", "esp32", "unavailable")
        self._last_received_timestamps[device_id] = 0.0

    # ─── Category & Field Query APIs ───

    def get_field(self, field_name: str, device_id: Optional[str] = None) -> Optional[TelemetryField]:
        t = self.get_telemetry(device_id)
        f_lower = field_name.lower().replace(" ", "_")

        if f_lower in ["temperature", "ambient_temperature", "temp"]:
            return t.environment.temperature_c
        elif f_lower in ["cpu_temperature", "cpu_temp"]:
            return t.system.cpu_temperature_c
        elif f_lower in ["humidity", "relative_humidity"]:
            return t.environment.humidity_percent
        elif f_lower in ["door"]:
            return t.hardware.door
        elif f_lower in ["hatch"]:
            return t.hardware.hatch
        elif f_lower in ["vibration"]:
            return t.hardware.vibration
        elif f_lower in ["voltage", "volts"]:
            return t.power.voltage_v
        elif f_lower in ["battery", "battery_percent", "battery_level"]:
            return t.power.battery_percent
        elif f_lower in ["charging", "is_charging"]:
            return t.power.charging
        elif f_lower in ["wifi", "wifi_status"]:
            return t.communication.wifi_status
        elif f_lower in ["server", "server_status"]:
            return t.communication.server_status
        elif f_lower in ["signal", "signal_strength", "rssi"]:
            return t.communication.signal_strength_dbm
        elif f_lower in ["free_heap", "memory", "ram", "heap"]:
            return t.system.free_heap_bytes
        elif f_lower in ["uptime", "uptime_seconds"]:
            return t.system.uptime_seconds
        elif f_lower in ["mic_1", "microphone_1"]:
            return t.audio.mic_1
        elif f_lower in ["mic_2", "microphone_2"]:
            return t.audio.mic_2
        elif f_lower in ["sample_rate", "sample_rate_hz"]:
            return t.audio.sample_rate_hz
        elif f_lower in ["mfcc_latency", "mfcc_latency_ms"]:
            return t.ml.mfcc_latency_ms
        elif f_lower in ["inference_latency", "inference_latency_ms"]:
            return t.ml.inference_latency_ms
        elif f_lower in ["wake_threshold", "threshold"]:
            return t.ml.wake_threshold
        elif f_lower in ["pressure", "barometric_pressure"]:
            return t.environment.pressure_kpa

        return None

    def get_category(self, category_name: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        t = self.get_telemetry(device_id)
        cat_lower = category_name.lower()

        if cat_lower in ["system"]:
            return {k: getattr(t.system, k).to_dict() for k in t.system.__dict__}
        elif cat_lower in ["communication", "comm", "network"]:
            return {k: getattr(t.communication, k).to_dict() for k in t.communication.__dict__}
        elif cat_lower in ["audio"]:
            return {k: getattr(t.audio, k).to_dict() for k in t.audio.__dict__}
        elif cat_lower in ["ml", "tinyml"]:
            return {k: getattr(t.ml, k).to_dict() for k in t.ml.__dict__}
        elif cat_lower in ["environment", "sensors"]:
            return {
                "temperature": t.environment.temperature_c.to_dict(),
                "humidity": t.environment.humidity_percent.to_dict(),
                "pressure": t.environment.pressure_kpa.to_dict(),
                "door": t.hardware.door.to_dict(),
                "vibration": t.hardware.vibration.to_dict()
            }
        elif cat_lower in ["power"]:
            return {k: getattr(t.power, k).to_dict() for k in t.power.__dict__}
        elif cat_lower in ["hardware"]:
            return {k: getattr(t.hardware, k).to_dict() for k in t.hardware.__dict__}
        elif cat_lower in ["faults", "diagnostics"]:
            return {"faults": list(t.faults), "warnings": list(t.warnings)}

        raise ValueError(f"Unknown category '{category_name}'.")

    # ─── Specialized Telemetry Retrieval APIs ───

    def get_device_identity(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "firmware_version": t.system.firmware_version.to_dict(),
            "timestamp": t.timestamp
        }

    def get_system_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "status": t.system.status.to_dict(),
            "uptime_seconds": t.system.uptime_seconds.to_dict(),
            "free_heap_bytes": t.system.free_heap_bytes.to_dict(),
            "cpu_usage_percent": t.system.cpu_usage_percent.to_dict(),
            "cpu_temperature_c": t.system.cpu_temperature_c.to_dict()
        }

    def get_temperature(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "ambient_temperature_c": t.environment.temperature_c.to_dict(),
            "cpu_temperature_c": t.system.cpu_temperature_c.to_dict()
        }

    def get_humidity(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "humidity_percent": t.environment.humidity_percent.to_dict()
        }

    def get_power_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "charging": t.power.charging.to_dict(),
            "battery_percent": t.power.battery_percent.to_dict(),
            "voltage_v": t.power.voltage_v.to_dict(),
            "current_ma": t.power.current_ma.to_dict(),
            "power_w": t.power.power_w.to_dict(),
            "status": t.power.status.to_dict()
        }

    def get_battery_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "battery_percent": t.power.battery_percent.to_dict(),
            "charging": t.power.charging.to_dict()
        }

    def get_charging_status(self) -> Dict[str, Any]:
        return self.get_battery_status()

    def get_communication_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "wifi_status": t.communication.wifi_status.to_dict(),
            "signal_strength_dbm": t.communication.signal_strength_dbm.to_dict(),
            "server_status": t.communication.server_status.to_dict(),
            "packet_loss_percent": t.communication.packet_loss_percent.to_dict(),
            "last_communication_seconds": t.communication.last_communication_seconds.to_dict()
        }

    def get_wifi_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "wifi_status": t.communication.wifi_status.to_dict(),
            "signal_strength_dbm": t.communication.signal_strength_dbm.to_dict()
        }

    def get_server_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "server_status": t.communication.server_status.to_dict(),
            "last_communication_seconds": t.communication.last_communication_seconds.to_dict()
        }

    def get_signal_strength(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "signal_strength_dbm": t.communication.signal_strength_dbm.to_dict()
        }

    def get_microphone_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "mic_1": t.audio.mic_1.to_dict(),
            "mic_2": t.audio.mic_2.to_dict(),
            "channels": t.audio.channels.to_dict(),
            "sample_rate_hz": t.audio.sample_rate_hz.to_dict()
        }

    def get_audio_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "mic_1": t.audio.mic_1.to_dict(),
            "mic_2": t.audio.mic_2.to_dict(),
            "vad_status": t.audio.vad_status.to_dict(),
            "wake_word_status": t.audio.wake_word_status.to_dict(),
            "last_wake_confidence": t.audio.last_wake_confidence.to_dict()
        }

    def get_ml_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "model": t.ml.model.to_dict(),
            "model_size_bytes": t.ml.model_size_bytes.to_dict(),
            "mfcc_latency_ms": t.ml.mfcc_latency_ms.to_dict(),
            "inference_latency_ms": t.ml.inference_latency_ms.to_dict(),
            "total_compute_latency_ms": t.ml.total_compute_latency_ms.to_dict(),
            "wake_threshold": t.ml.wake_threshold.to_dict(),
            "acwe": t.ml.acwe.to_dict(),
            "status": t.ml.status.to_dict()
        }

    def get_mfcc_latency(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {"device_id": t.device_id, "mfcc_latency_ms": t.ml.mfcc_latency_ms.to_dict()}

    def get_inference_latency(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {"device_id": t.device_id, "inference_latency_ms": t.ml.inference_latency_ms.to_dict()}

    def get_wake_word_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "wake_word_status": t.audio.wake_word_status.to_dict(),
            "wake_threshold": t.ml.wake_threshold.to_dict(),
            "acwe": t.ml.acwe.to_dict(),
            "last_wake_confidence": t.audio.last_wake_confidence.to_dict()
        }

    def get_door_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {"device_id": t.device_id, "door": t.hardware.door.to_dict()}

    def get_hatch_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {"device_id": t.device_id, "hatch": t.hardware.hatch.to_dict()}

    def get_sensor_status(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return {
            "device_id": t.device_id,
            "temperature": t.environment.temperature_c.to_dict(),
            "humidity": t.environment.humidity_percent.to_dict(),
            "pressure": t.environment.pressure_kpa.to_dict(),
            "door": t.hardware.door.to_dict(),
            "vibration": t.hardware.vibration.to_dict()
        }

    def get_faults(self) -> List[str]:
        t = self.get_telemetry()
        return list(t.faults)

    def get_warnings(self) -> List[str]:
        t = self.get_telemetry()
        return list(t.warnings)

    def get_recent_events(self) -> List[Dict[str, str]]:
        t = self.get_telemetry()
        return [{"event": e.event, "timestamp": e.timestamp} for e in t.events]

    def get_complete_machine_state(self) -> Dict[str, Any]:
        t = self.get_telemetry()
        return t.to_dict()
