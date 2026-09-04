"""
Stage 9B Unit Tests: ESP32-Provided Device Identity Preservation.
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager

class TestDeviceIdentity(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager()

    def test_device_identity_preservation(self):
        payload = {
            "device_id": "TRINETRA-001",
            "source": "esp32",
            "system": {"uptime": 500}
        }
        self.mgr.ingest_telemetry_payload(payload)
        t = self.mgr.get_telemetry("TRINETRA-001")
        self.assertEqual(t.device_id, "TRINETRA-001")

    def test_missing_device_id_fails(self):
        payload = {
            "source": "esp32",
            "system": {"uptime": 500}
        }
        with self.assertRaises(ValueError):
            self.mgr.ingest_telemetry_payload(payload)

    def test_new_device_auto_registration(self):
        new_payload = {
            "device_id": "TRINETRA-004",
            "source": "esp32",
            "system": {"uptime": 120}
        }
        self.mgr.ingest_telemetry_payload(new_payload)
        self.assertTrue(self.mgr.registry.has_device("TRINETRA-004"))
        t4 = self.mgr.get_telemetry("TRINETRA-004")
        self.assertEqual(t4.device_id, "TRINETRA-004")

if __name__ == "__main__":
    unittest.main()
