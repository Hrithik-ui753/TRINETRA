"""
Stage 9B Unit Tests: Backend & Manager Telemetry Ingestion.
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager

class TestTelemetryIngestion(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager()

    def test_successful_ingestion(self):
        payload = {
            "device_id": "TRINETRA-001",
            "source": "esp32",
            "status": "valid",
            "system": {
                "uptime": 22000,
                "free_heap": 405000,
            },
            "sensors": {
                "temperature": 28.7,
                "door": "closed"
            },
            "power": {
                "voltage": 5.01
            }
        }
        res = self.mgr.ingest_telemetry_payload(payload)
        self.assertEqual(res["status"], "accepted")
        self.assertEqual(res["device_id"], "TRINETRA-001")
        self.assertEqual(res["source"], "esp32")

        # Verify manager retrieved values match ingested payload
        t = self.mgr.get_telemetry("TRINETRA-001")
        self.assertEqual(t.system.uptime_seconds.value, 22000)
        self.assertEqual(t.environment.temperature_c.value, 28.7)
        self.assertEqual(t.power.voltage_v.value, 5.01)
        self.assertEqual(t.system.uptime_seconds.source, "esp32")

    def test_malformed_ingestion_rejection(self):
        malformed_payload = {
            "device_id": "TRINETRA-001",
            "system": {
                "uptime": "twenty-two-thousand"
            }
        }
        with self.assertRaises(ValueError):
            self.mgr.ingest_telemetry_payload(malformed_payload)

if __name__ == "__main__":
    unittest.main()
