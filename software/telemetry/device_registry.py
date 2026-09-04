"""
Device Registry for Multi-Machine TRINETRA Ecosystem.
Tracks active, connected, and simulated edge units.
"""

from typing import Dict, List, Optional
from .telemetry_schema import MachineTelemetry
from .simulated_devices import create_trinetra_001, create_trinetra_002, create_trinetra_003

class DeviceRegistry:
    def __init__(self):
        self._devices: Dict[str, MachineTelemetry] = {}
        self.load_default_profiles()

    def load_default_profiles(self):
        self.register_device(create_trinetra_001())
        self.register_device(create_trinetra_002())
        self.register_device(create_trinetra_003())

    def register_device(self, telemetry: MachineTelemetry):
        self._devices[telemetry.device_id] = telemetry

    def get_device(self, device_id: str) -> Optional[MachineTelemetry]:
        return self._devices.get(device_id)

    def list_devices(self) -> List[str]:
        return list(self._devices.keys())

    def has_device(self, device_id: str) -> bool:
        return device_id in self._devices

    def update_device_telemetry(self, device_id: str, telemetry: MachineTelemetry):
        self._devices[device_id] = telemetry
