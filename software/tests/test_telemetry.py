"""
Unit tests for Telemetry Schema, Field/Category Getters, and Validation (Stage 9A).
"""

import unittest
from software.telemetry.telemetry_schema import MachineTelemetry, TelemetryField
from software.telemetry.telemetry_manager import TelemetryManager
from software.telemetry.device_registry import DeviceRegistry
from software.telemetry.simulated_devices import create_trinetra_001, create_trinetra_002, create_trinetra_003

class TestTelemetryManager(unittest.TestCase):
    def setUp(self):
        self.registry = DeviceRegistry()
        self.mgr = TelemetryManager(registry=self.registry, default_device_id="TRINETRA-001")

    def test_device_registration(self):
        self.assertTrue(self.registry.has_device("TRINETRA-001"))
        self.assertTrue(self.registry.has_device("TRINETRA-002"))
        self.assertTrue(self.registry.has_device("TRINETRA-003"))
        self.assertEqual(len(self.registry.list_devices()), 3)

    def test_schema_provenance(self):
        t1 = self.mgr.get_telemetry()
        self.assertEqual(t1.device_id, "TRINETRA-001")
        # Check field provenance metadata
        temp = t1.environment.temperature_c
        self.assertEqual(temp.value, 28.4)
        self.assertEqual(temp.unit, "C")
        self.assertEqual(temp.source, "local_sensor")
        self.assertEqual(temp.status, "simulated")

    def test_get_field_apis(self):
        temp_f = self.mgr.get_field("temperature")
        self.assertIsNotNone(temp_f)
        self.assertEqual(temp_f.value, 28.4)

        door_f = self.mgr.get_field("door")
        self.assertEqual(door_f.value, "closed")

        wifi_f = self.mgr.get_field("wifi")
        self.assertEqual(wifi_f.value, "connected")

        voltage_f = self.mgr.get_field("voltage")
        self.assertEqual(voltage_f.value, 5.02)

    def test_get_category_apis(self):
        sensors_cat = self.mgr.get_category("sensors")
        self.assertIn("temperature", sensors_cat)
        self.assertIn("humidity", sensors_cat)
        self.assertIn("door", sensors_cat)
        self.assertEqual(sensors_cat["temperature"]["value"], 28.4)

        power_cat = self.mgr.get_category("power")
        self.assertEqual(power_cat["voltage_v"]["value"], 5.02)

        ml_cat = self.mgr.get_category("ml")
        self.assertEqual(ml_cat["mfcc_latency_ms"]["value"], 2.636)
        self.assertEqual(ml_cat["inference_latency_ms"]["value"], 0.146)

    def test_missing_and_invalid_fields(self):
        # Pressure is unavailable on all devices
        press_f = self.mgr.get_field("pressure")
        self.assertIsNone(press_f.value)
        self.assertEqual(press_f.status, "unavailable")

        # Unknown field returns None
        unknown_f = self.mgr.get_field("non_existent_random_sensor")
        self.assertIsNone(unknown_f)

    def test_telemetry_validation(self):
        t = self.mgr.get_telemetry()
        self.assertTrue(self.mgr.validate_telemetry(t))

if __name__ == "__main__":
    unittest.main()
