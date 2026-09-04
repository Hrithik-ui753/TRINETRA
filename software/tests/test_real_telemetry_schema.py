"""
Stage 9B Unit Tests: Real ESP32 Telemetry Schema Validation.
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager

class TestRealTelemetrySchema(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager()

    def test_valid_esp32_payload_schema(self):
        payload = {
            "device_id": "TRINETRA-001",
            "source": "esp32",
            "status": "valid",
            "system": {
                "uptime": 18452,
                "free_heap": 410000,
                "cpu_temperature": None
            },
            "communication": {
                "wifi": "connected",
                "server": "connected",
                "signal_strength": -61
            },
            "audio": {
                "mic_1": "active",
                "mic_2": "active",
                "sample_rate": 16000
            },
            "ml": {
                "mfcc_latency_ms": 2.636,
                "inference_latency_ms": 0.146,
                "wake_threshold": 0.85
            },
            "sensors": {
                "temperature": 28.7,
                "humidity": None,
                "door": "closed"
            },
            "power": {
                "voltage": 5.01,
                "status": "normal"
            },
            "faults": []
        }
        is_valid, reason = self.mgr.validate_ingestion_payload(payload)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "OK")

    def test_missing_device_id_rejection(self):
        payload = {
            "source": "esp32",
            "system": {"uptime": 100}
        }
        is_valid, reason = self.mgr.validate_ingestion_payload(payload)
        self.assertFalse(is_valid)
        self.assertIn("device_id", reason)

    def test_invalid_temperature_type_rejection(self):
        payload = {
            "device_id": "TRINETRA-001",
            "sensors": {"temperature": "not-a-number"}
        }
        is_valid, reason = self.mgr.validate_ingestion_payload(payload)
        self.assertFalse(is_valid)
        self.assertIn("temperature", reason)

    def test_null_unequipped_sensors_accepted(self):
        payload = {
            "device_id": "TRINETRA-001",
            "sensors": {
                "temperature": None,
                "humidity": None,
                "door": "unknown"
            }
        }
        is_valid, reason = self.mgr.validate_ingestion_payload(payload)
        self.assertTrue(is_valid)

if __name__ == "__main__":
    unittest.main()
