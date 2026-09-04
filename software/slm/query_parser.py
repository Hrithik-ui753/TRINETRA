"""
Lightweight Natural Language Query & Intent Parser for TRINETRA SLM (Stage 9A).
Extracts operational intent and maps queries to structured intent/entity pairs.
"""

import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional

@dataclass
class QueryIntent:
    intent: str
    entity: str
    confidence: float
    required_telemetry_keys: List[str]
    target_device_override: Optional[str] = None
    is_actuator_command: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "entity": self.entity,
            "confidence": self.confidence,
            "required_telemetry_keys": self.required_telemetry_keys,
            "target_device_override": self.target_device_override,
            "is_actuator_command": self.is_actuator_command
        }

class QueryParser:
    """
    Classifies operator queries into discrete Stage 9A telemetry intent categories.
    """

    ACTUATOR_KEYWORDS = [
        "turn off", "shutdown", "reboot", "restart", "unlock hatch", "open door",
        "close door", "lock hatch", "set power", "disable", "kill", "format"
    ]

    INTENT_PATTERNS = [
        # Actuator / Command guard
        (
            "ACTUATOR_COMMAND",
            "actuator",
            [r"\b(turn off|shut down|reboot|restart|unlock|open the door|close the door|disable)\b"],
            [],
            True
        ),
        # CPU Temperature
        (
            "CPU_TEMPERATURE",
            "cpu_temperature",
            [r"\b(cpu temperature|cpu temp|processor temp|processor temperature)\b"],
            ["system.cpu_temperature_c"],
            False
        ),
        # Temperature
        (
            "TEMPERATURE",
            "temperature",
            [r"\b(temperature|temp|how hot|how cold|heat|thermal)\b"],
            ["environment.temperature_c", "system.cpu_temperature_c"],
            False
        ),
        # Humidity
        (
            "HUMIDITY",
            "humidity",
            [r"\b(humidity|moisture|damp)\b"],
            ["environment.humidity_percent"],
            False
        ),
        # Door / Enclosure
        (
            "DOOR",
            "door",
            [r"\b(door|chamber door|is the door closed|is the door open)\b"],
            ["hardware.door"],
            False
        ),
        # Power / Charging / Voltage
        (
            "VOLTAGE",
            "voltage",
            [r"\b(voltage|volts|supply voltage|bus voltage)\b"],
            ["power.voltage_v"],
            False
        ),
        (
            "BATTERY_HEALTH",
            "battery_health",
            [r"\b(battery health|state of health|soh|battery degradation)\b"],
            ["power.battery_health"],
            False
        ),
        (
            "POWER",
            "power",
            [r"\b(charging|charge|plugged in|battery|battery level|battery percent|power status|power draw|consumption)\b"],
            ["power.charging", "power.battery_percent", "power.voltage_v", "power.status"],
            False
        ),
        # Communication / Wi-Fi / Server / Signal
        (
            "WIFI",
            "wifi",
            [r"\b(wi-fi|wifi|wireless)\b"],
            ["communication.wifi_status", "communication.signal_strength_dbm"],
            False
        ),
        (
            "SIGNAL",
            "signal",
            [r"\b(signal|signal strength|rssi|dbm)\b"],
            ["communication.signal_strength_dbm"],
            False
        ),
        (
            "SERVER",
            "server",
            [r"\b(server|backend|cloud connection|server status)\b"],
            ["communication.server_status", "communication.packet_loss_percent"],
            False
        ),
        (
            "COMMUNICATION",
            "communication",
            [r"\b(communication|communication status|network|connectivity)\b"],
            ["communication.wifi_status", "communication.server_status", "communication.signal_strength_dbm"],
            False
        ),
        # Audio / Microphone / Sample Rate
        (
            "SAMPLE_RATE",
            "sample_rate",
            [r"\b(sample rate|sampling frequency|16000|16 khz)\b"],
            ["audio.sample_rate_hz"],
            False
        ),
        (
            "MICROPHONE",
            "microphone",
            [r"\b(microphones?|mic 1|mic 2|both microphones|dual mic|mics working|mic status)\b"],
            ["audio.mic_1", "audio.mic_2", "audio.channels"],
            False
        ),
        (
            "AUDIO",
            "audio",
            [r"\b(audio|audio status|vad|voice activity)\b"],
            ["audio.mic_1", "audio.mic_2", "audio.vad_status"],
            False
        ),
        # ML / Latency / Wake Threshold
        (
            "MFCC",
            "mfcc",
            [r"\b(mfcc|mfcc latency|mfcc extraction)\b"],
            ["ml.mfcc_latency_ms"],
            False
        ),
        (
            "INFERENCE",
            "inference",
            [r"\b(inference latency|model latency|ds-cnn latency|ds cnn latency|how fast is inference)\b"],
            ["ml.inference_latency_ms"],
            False
        ),
        (
            "WAKE_THRESHOLD",
            "wake_threshold",
            [r"\b(wake[- ]word threshold|threshold|acwe|wake detector status)\b"],
            ["ml.wake_threshold", "ml.acwe", "audio.wake_word_status"],
            False
        ),
        # System / Memory / Uptime
        (
            "HEAP",
            "heap",
            [r"\b(free heap|heap memory|internal sram|free sram)\b"],
            ["system.free_heap_bytes"],
            False
        ),
        (
            "MEMORY",
            "memory",
            [r"\b(memory|ram|bytes available|how much memory)\b"],
            ["system.free_heap_bytes"],
            False
        ),
        (
            "UPTIME",
            "uptime",
            [r"\b(uptime|how long|running for|how long has the machine been running|runtime)\b"],
            ["system.uptime_seconds"],
            False
        ),
        # Device Identity
        (
            "DEVICE",
            "device",
            [r"\b(which machine|what machine|device id|which device|current device)\b"],
            ["device_id"],
            False
        ),
        # Diagnostics / Faults / Health / Status
        (
            "FAULT",
            "fault",
            [r"\b(faults?|errors?|issues?|problems?|what is wrong|wrong with|broken|failures?|warnings?)\b"],
            ["faults", "warnings", "system.status"],
            False
        ),
        (
            "HEALTH",
            "health",
            [r"\b(is the machine healthy|everything okay|all good|is it okay|health status)\b"],
            ["system.status", "faults", "warnings", "power.status"],
            False
        ),
        (
            "STATUS",
            "status",
            [r"\b(complete status|full status|overall status|system summary|machine status|all status|give me the complete)\b"],
            ["system.status", "environment.temperature_c", "power.battery_percent", "communication.wifi_status", "faults"],
            False
        )
    ]

    @classmethod
    def parse_query(cls, query_text: str) -> QueryIntent:
        q = query_text.strip()
        lower = q.lower()

        device_match = re.search(r"\b(TRINETRA-\d{3})\b", q, re.IGNORECASE)
        target_override = device_match.group(1).upper() if device_match else None

        for act in cls.ACTUATOR_KEYWORDS:
            if act in lower:
                return QueryIntent(
                    intent="ACTUATOR_COMMAND",
                    entity="actuator",
                    confidence=1.0,
                    required_telemetry_keys=[],
                    target_device_override=target_override,
                    is_actuator_command=True
                )

        for intent_name, entity_name, patterns, req_keys, is_actuator in cls.INTENT_PATTERNS:
            for pat in patterns:
                if re.search(pat, lower):
                    return QueryIntent(
                        intent=intent_name,
                        entity=entity_name,
                        confidence=0.95,
                        required_telemetry_keys=req_keys,
                        target_device_override=target_override,
                        is_actuator_command=is_actuator
                    )

        return QueryIntent(
            intent="STATUS",
            entity="status",
            confidence=0.5,
            required_telemetry_keys=["system.status", "environment.temperature_c", "power.battery_percent", "faults"],
            target_device_override=target_override,
            is_actuator_command=False
        )
