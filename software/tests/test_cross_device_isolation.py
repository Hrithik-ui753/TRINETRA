"""
Adversarial Unit Tests for Cross-Device Telemetry Isolation (Stage 9A).
Verifies that Cross-Device Leakage is strictly 0 across all telemetry categories.
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager
from software.slm.slm_engine import SLMEngine

class TestCrossDeviceIsolation(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager(default_device_id="TRINETRA-001")
        self.slm = SLMEngine(self.mgr)

    def test_temperature_adversarial_isolation(self):
        # TRINETRA-001 (28.4°C)
        self.mgr.select_device("TRINETRA-001")
        r1 = self.slm.process_query("What is the machine temperature?")["response"]
        self.assertIn("28.4", r1)
        self.assertNotIn("34.7", r1)
        self.assertNotIn("24.8", r1)

        # TRINETRA-002 (34.7°C)
        self.mgr.select_device("TRINETRA-002")
        r2 = self.slm.process_query("What is the machine temperature?")["response"]
        self.assertIn("34.7", r2)
        self.assertNotIn("28.4", r2)
        self.assertNotIn("24.8", r2)

        # TRINETRA-003 (24.8°C)
        self.mgr.select_device("TRINETRA-003")
        r3 = self.slm.process_query("What is the machine temperature?")["response"]
        self.assertIn("24.8", r3)
        self.assertNotIn("28.4", r3)
        self.assertNotIn("34.7", r3)

    def test_voltage_adversarial_isolation(self):
        # TRINETRA-001: 5.02V
        self.mgr.select_device("TRINETRA-001")
        r1 = self.slm.process_query("What is the voltage?")["response"]
        self.assertIn("5.02", r1)
        self.assertNotIn("4.91", r1)
        self.assertNotIn("4.76", r1)

        # TRINETRA-002: 4.91V
        self.mgr.select_device("TRINETRA-002")
        r2 = self.slm.process_query("What is the voltage?")["response"]
        self.assertIn("4.91", r2)
        self.assertNotIn("5.02", r2)
        self.assertNotIn("4.76", r2)

        # TRINETRA-003: 4.76V
        self.mgr.select_device("TRINETRA-003")
        r3 = self.slm.process_query("What is the voltage?")["response"]
        self.assertIn("4.76", r3)
        self.assertNotIn("5.02", r3)
        self.assertNotIn("4.91", r3)

    def test_door_and_fault_isolation(self):
        # TRINETRA-001: closed, 0 faults
        self.mgr.select_device("TRINETRA-001")
        r1_door = self.slm.process_query("Is the door closed?")["response"]
        r1_fault = self.slm.process_query("Are there any faults?")["response"]
        self.assertIn("closed", r1_door.lower())
        self.assertIn("0 active faults", r1_fault)
        self.assertNotIn("MIC_02", r1_fault)

        # TRINETRA-002: open, fault: MIC_02
        self.mgr.select_device("TRINETRA-002")
        r2_door = self.slm.process_query("Is the door closed?")["response"]
        r2_fault = self.slm.process_query("Are there any faults?")["response"]
        self.assertIn("open", r2_door.lower())
        self.assertIn("MIC_02", r2_fault)
        self.assertNotIn("0 active faults", r2_fault)

if __name__ == "__main__":
    unittest.main()
