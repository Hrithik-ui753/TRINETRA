"""
Stage 9B Unit Tests: Real ESP32 Device Isolation & Adversarial Zero-Leakage.
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager
from software.slm.slm_engine import SLMEngine

class TestRealDeviceIsolation(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager(default_device_id="TRINETRA-001")
        self.slm = SLMEngine(self.mgr)

    def test_real_device_isolation_adversarial(self):
        # Ingest Real ESP32 telemetry for TRINETRA-001
        self.mgr.ingest_telemetry_payload({
            "device_id": "TRINETRA-001",
            "source": "esp32",
            "sensors": {"temperature": 28.7, "door": "closed"},
            "power": {"voltage": 5.01}
        })

        # Ingest Real ESP32 telemetry for TRINETRA-002
        self.mgr.ingest_telemetry_payload({
            "device_id": "TRINETRA-002",
            "source": "esp32",
            "sensors": {"temperature": 41.2, "door": "open"},
            "power": {"voltage": 4.88}
        })

        # Query TRINETRA-001
        self.mgr.select_device("TRINETRA-001")
        r1 = self.slm.process_query("What is the machine temperature?")["response"]
        self.assertIn("28.7°C", r1)
        self.assertNotIn("41.2", r1)

        # Query TRINETRA-002
        self.mgr.select_device("TRINETRA-002")
        r2 = self.slm.process_query("What is the machine temperature?")["response"]
        self.assertIn("41.2°C", r2)
        self.assertNotIn("28.7", r2)

if __name__ == "__main__":
    unittest.main()
