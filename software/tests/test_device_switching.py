"""
Unit tests for Dynamic Machine Switching across TRINETRA-001, 002, 003 (Stage 9A).
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager
from software.telemetry.device_registry import DeviceRegistry
from software.slm.slm_engine import SLMEngine

class TestDeviceSwitching(unittest.TestCase):
    def setUp(self):
        self.registry = DeviceRegistry()
        self.mgr = TelemetryManager(registry=self.registry, default_device_id="TRINETRA-001")
        self.slm = SLMEngine(self.mgr)

    def test_multi_device_switching_step_sequence(self):
        query_temp = "What is the machine temperature?"
        query_door = "Is the door closed?"
        query_wifi = "Is Wi-Fi connected?"
        query_volt = "What is the voltage?"

        # STEP 1: Select TRINETRA-001
        self.mgr.select_device("TRINETRA-001")
        self.assertEqual(self.mgr.get_selected_device(), "TRINETRA-001")
        r1_temp = self.slm.process_query(query_temp)["response"]
        r1_door = self.slm.process_query(query_door)["response"]
        r1_wifi = self.slm.process_query(query_wifi)["response"]
        r1_volt = self.slm.process_query(query_volt)["response"]

        self.assertIn("28.4°C", r1_temp)
        self.assertIn("door is closed", r1_door.lower())
        self.assertIn("connected", r1_wifi.lower())
        self.assertIn("5.02", r1_volt)

        # STEP 2: Switch to TRINETRA-002
        self.mgr.select_device("TRINETRA-002")
        self.assertEqual(self.mgr.get_selected_device(), "TRINETRA-002")
        r2_temp = self.slm.process_query(query_temp)["response"]
        r2_door = self.slm.process_query(query_door)["response"]
        r2_wifi = self.slm.process_query(query_wifi)["response"]
        r2_volt = self.slm.process_query(query_volt)["response"]

        self.assertIn("34.7°C", r2_temp)
        self.assertIn("open", r2_door.lower())
        self.assertIn("connected", r2_wifi.lower())
        self.assertIn("4.91", r2_volt)

        # STEP 3: Switch to TRINETRA-003
        self.mgr.select_device("TRINETRA-003")
        self.assertEqual(self.mgr.get_selected_device(), "TRINETRA-003")
        r3_temp = self.slm.process_query(query_temp)["response"]
        r3_door = self.slm.process_query(query_door)["response"]
        r3_wifi = self.slm.process_query(query_wifi)["response"]
        r3_volt = self.slm.process_query(query_volt)["response"]

        self.assertIn("24.8°C", r3_temp)
        self.assertIn("closed", r3_door.lower())
        self.assertIn("disconnected", r3_wifi.lower())
        self.assertIn("4.76", r3_volt)

    def test_invalid_device_exception(self):
        with self.assertRaises(ValueError):
            self.mgr.select_device("TRINETRA-UNKNOWN-999")

if __name__ == "__main__":
    unittest.main()
