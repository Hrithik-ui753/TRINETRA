"""
Stage 9B Unit Tests: Telemetry Freshness & Stale Detection.
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager
from software.slm.slm_engine import SLMEngine

class TestTelemetryFreshness(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager(default_device_id="TRINETRA-001")
        self.slm = SLMEngine(self.mgr)

    def test_fresh_telemetry(self):
        payload = {
            "device_id": "TRINETRA-001",
            "source": "esp32",
            "sensors": {"temperature": 28.7}
        }
        self.mgr.ingest_telemetry_payload(payload)
        self.assertTrue(self.mgr.check_freshness("TRINETRA-001", max_age_seconds=15.0))

        res = self.slm.process_query("What is the machine temperature?")
        self.assertIn("28.7°C", res["response"])

    def test_stale_telemetry_detection_and_slm_handling(self):
        self.mgr.set_device_stale("TRINETRA-001")
        self.assertTrue(self.mgr.is_stale("TRINETRA-001"))

        # Verify SLM does NOT present stale telemetry as current
        res = self.slm.process_query("What is the machine temperature?")
        self.assertIn("stale", res["response"].lower())
        self.assertIn("unavailable", res["response"].lower())

    def test_hardware_disconnected_slm_handling(self):
        self.mgr.set_device_disconnected("TRINETRA-001")
        res = self.slm.process_query("What is the machine temperature?")
        self.assertIn("disconnected", res["response"].lower())

if __name__ == "__main__":
    unittest.main()
