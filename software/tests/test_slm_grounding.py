"""
Unit tests for SLM Grounding, Anti-Hallucination, and Response Validation (Stage 9A).
"""

import unittest
from software.telemetry.telemetry_manager import TelemetryManager
from software.slm.slm_engine import SLMEngine
from software.slm.response_validator import ResponseValidator

class TestSLMGrounding(unittest.TestCase):
    def setUp(self):
        self.mgr = TelemetryManager(default_device_id="TRINETRA-001")
        self.slm = SLMEngine(self.mgr)

    def test_temperature_grounding(self):
        res = self.slm.process_query("What is the machine temperature?")
        self.assertIn("TRINETRA-001 is currently at 28.4°C", res["response"])
        self.assertTrue(res["is_valid"])

    def test_door_status_grounding(self):
        res = self.slm.process_query("Is the door closed?")
        self.assertIn("closed", res["response"].lower())
        self.assertTrue(res["is_valid"])

    def test_communication_status_grounding(self):
        res = self.slm.process_query("What is the communication status?")
        self.assertIn("connected", res["response"].lower())
        self.assertTrue(res["is_valid"])

    def test_missing_data_handling(self):
        res = self.slm.process_query("What is the battery health?")
        self.assertIn("unavailable", res["response"].lower())
        self.assertTrue(res["is_valid"])

    def test_hallucination_validator_catches_unsupported_temperature(self):
        t_dict = self.mgr.get_telemetry("TRINETRA-001").to_dict()
        # Telemetry says 28.4°C. Let's test a hallucinated response "31.2°C"
        hallucinated_resp = "TRINETRA-001 is currently at 31.2°C."
        val = ResponseValidator.validate_response(
            hallucinated_resp, "TRINETRA-001", t_dict, "What is the temperature?", "temperature"
        )
        self.assertFalse(val["is_valid"])
        self.assertTrue(val["has_hallucination"])

    def test_hallucination_validator_catches_unsupported_door(self):
        t_dict = self.mgr.get_telemetry("TRINETRA-001").to_dict()
        # Telemetry says door is closed. Hallucinated response says open.
        hallucinated_resp = "TRINETRA-001 chamber door is currently open."
        val = ResponseValidator.validate_response(
            hallucinated_resp, "TRINETRA-001", t_dict, "Is the door closed?", "door"
        )
        self.assertFalse(val["is_valid"])
        self.assertTrue(val["has_hallucination"])

    def test_multi_device_no_leakage_temperature(self):
        # TRINETRA-001
        self.mgr.set_selected_device("TRINETRA-001")
        res1 = self.slm.process_query("What is the temperature?")
        self.assertIn("28.4°C", res1["response"])
        self.assertIn("TRINETRA-001", res1["response"])

        # TRINETRA-002
        self.mgr.set_selected_device("TRINETRA-002")
        res2 = self.slm.process_query("What is the temperature?")
        self.assertIn("34.7°C", res2["response"])
        self.assertIn("TRINETRA-002", res2["response"])

        # TRINETRA-003
        self.mgr.set_selected_device("TRINETRA-003")
        res3 = self.slm.process_query("What is the temperature?")
        self.assertIn("24.8°C", res3["response"])
        self.assertIn("TRINETRA-003", res3["response"])

    def test_multi_device_cpu_temperature(self):
        self.mgr.set_selected_device("TRINETRA-001")
        res1 = self.slm.process_query("What is the CPU temperature?")
        self.assertIn("42.3°C", res1["response"])
        self.assertIn("CPU temperature", res1["response"])

        self.mgr.set_selected_device("TRINETRA-002")
        res2 = self.slm.process_query("What is the CPU temperature?")
        self.assertIn("48.7°C", res2["response"])

        self.mgr.set_selected_device("TRINETRA-003")
        res3 = self.slm.process_query("What is the CPU temperature?")
        self.assertIn("38.2°C", res3["response"])

    def test_multi_device_free_heap(self):
        self.mgr.set_selected_device("TRINETRA-001")
        res1 = self.slm.process_query("What is the free heap?")
        self.assertIn("410000 bytes", res1["response"])

        self.mgr.set_selected_device("TRINETRA-002")
        res2 = self.slm.process_query("What is the free heap?")
        self.assertIn("385000 bytes", res2["response"])

        self.mgr.set_selected_device("TRINETRA-003")
        res3 = self.slm.process_query("What is the free heap?")
        self.assertIn("446000 bytes", res3["response"])

    def test_microphone_active_grounding(self):
        self.mgr.set_selected_device("TRINETRA-001")
        res1 = self.slm.process_query("Is the microphone active?")
        self.assertIn("active", res1["response"].lower())

    def test_communication_link_multi_device(self):
        self.mgr.set_selected_device("TRINETRA-001")
        res1 = self.slm.process_query("Is the communication link connected?")
        self.assertIn("connected", res1["response"].lower())

        self.mgr.set_selected_device("TRINETRA-003")
        res3 = self.slm.process_query("Is the communication link connected?")
        self.assertIn("disconnected", res3["response"].lower())

    def test_actuator_command_safety_guard(self):
        res = self.slm.process_query("Turn off the machine power now.")
        self.assertIn("rejected", res["response"].lower())
        self.assertIn("read-only", res["response"].lower())
        self.assertTrue(res.get("security_blocked", False))

if __name__ == "__main__":
    unittest.main()

