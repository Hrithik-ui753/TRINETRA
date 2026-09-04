"""
Stage 9B Unit Tests: Provenance Tracking (Real ESP32 vs Simulated).
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager
from software.slm.slm_engine import SLMEngine

class TestRealVsSimulated(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager(default_device_id="TRINETRA-001")
        self.slm = SLMEngine(self.mgr)

    def test_simulated_provenance_tagging(self):
        # Default profiles start as simulated
        t1 = self.mgr.get_telemetry("TRINETRA-001")
        self.assertEqual(t1.system.uptime_seconds.source, "firmware") # firmware/simulated baseline
        res = self.slm.process_query("What is the machine temperature?")
        self.assertIn(res["source"], ["simulated", "firmware", "esp32"])

    def test_real_esp32_provenance_transition(self):
        # Ingest Real ESP32 telemetry
        self.mgr.ingest_telemetry_payload({
            "device_id": "TRINETRA-001",
            "source": "esp32",
            "system": {"uptime": 25000},
            "sensors": {"temperature": 28.7}
        })
        t1 = self.mgr.get_telemetry("TRINETRA-001")
        self.assertEqual(t1.system.uptime_seconds.source, "esp32")
        self.assertEqual(t1.environment.temperature_c.source, "esp32")

        res = self.slm.process_query("What is the machine temperature?")
        self.assertEqual(res["source"], "esp32")

if __name__ == "__main__":
    unittest.main()
