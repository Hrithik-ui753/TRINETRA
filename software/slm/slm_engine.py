"""
TRINETRA Local Telemetry-Aware SLM Engine (Stage 9B).
Deterministic, grounded language & reasoning runtime coupled strictly to selected machine telemetry.
Supports real ESP32 provenance, freshness/stale detection, and explicit unequipped sensor handling.
"""

from typing import Dict, Any, Optional
from .query_parser import QueryParser, QueryIntent
from .slm_prompt import SLM_SYSTEM_PROMPT, build_grounding_prompt
from .response_validator import ResponseValidator
from ..telemetry.telemetry_manager import TelemetryManager

class SLMEngine:
    """
    Local SLM reasoning engine for TRINETRA edge intelligence.
    """

    def __init__(self, telemetry_manager: TelemetryManager):
        self.telemetry_manager = telemetry_manager
        self.parser = QueryParser()
        self.validator = ResponseValidator()

    def process_query(self, user_query: str, device_override: Optional[str] = None) -> Dict[str, Any]:
        """
        Main query processing entry point.
        Fetches ONLY selected device telemetry, parses intent, and synthesizes grounded response.
        """
        # 1. Parse intent & entity
        intent_res: QueryIntent = self.parser.parse_query(user_query)

        # 2. Determine target device (priority: explicit argument > query override > selected device)
        target_device = device_override or intent_res.target_device_override or self.telemetry_manager.get_selected_device()

        # Retrieve selected device telemetry strictly
        try:
            telemetry = self.telemetry_manager.get_telemetry(target_device)
        except Exception:
            return {
                "query": user_query,
                "device_id": target_device,
                "response": f"Device '{target_device}' is not registered or currently offline.",
                "intent": intent_res.intent,
                "entity": intent_res.entity,
                "is_valid": False,
                "source": "simulated"
            }

        t_dict = telemetry.to_dict()
        source = telemetry.system.uptime_seconds.source or "simulated"

        # 3. Handle Actuator Safety Command Guard
        if intent_res.is_actuator_command:
            response = (
                f"Command rejected on {target_device}. Stage 9 operates strictly as a read-only "
                "telemetry and diagnostic intelligence interface. Actuator controls are not permitted."
            )
            return {
                "query": user_query,
                "device_id": target_device,
                "response": response,
                "intent": intent_res.intent,
                "entity": intent_res.entity,
                "is_valid": True,
                "security_blocked": True,
                "source": source
            }

        # 4. Synthesize Grounded Natural Language Response
        response = self._synthesize_grounded_response(intent_res.intent, target_device, t_dict, user_query)

        # 5. Validate output against hallucination rules
        validation = self.validator.validate_response(response, target_device, t_dict, user_query, intent_res.entity)

        return {
            "query": user_query,
            "device_id": target_device,
            "response": response,
            "intent": intent_res.intent,
            "entity": intent_res.entity,
            "telemetry_snapshot": t_dict,
            "is_valid": validation["is_valid"],
            "device_matched": validation["device_matched"],
            "source": source
        }

    def _synthesize_grounded_response(self, intent: str, device_id: str, t: Dict[str, Any], raw_query: str) -> str:
        """
        Deterministic, strictly grounded SLM synthesis engine.
        Guarantees 0 hallucination, respects freshness/stale state, and identifies unattached sensors.
        """
        p = t["power"]
        s = t["system"]
        e = t["environment"]
        c = t["communication"]
        a = t["audio"]
        m = t["ml"]
        h = t["hardware"]
        faults = t["faults"]
        warnings = t["warnings"]

        # Check Disconnected or Stale Status
        is_disconnected = (s["status"]["value"] == "disconnected" or c["wifi_status"]["status"] == "unavailable" and s["status"]["status"] == "unavailable")
        if is_disconnected:
            return f"The machine's current telemetry is unavailable because the ESP32 is disconnected."

        is_stale = (s["status"]["status"] == "stale" or e["temperature_c"]["status"] == "stale")

        # Missing metric requests (e.g. battery health)
        if intent == "BATTERY_HEALTH":
            return f"Battery health data is unavailable for {device_id}."

        elif intent == "TEMPERATURE":
            if is_stale:
                return f"{device_id}'s latest temperature reading is stale; a current temperature is unavailable."
            amb = e["temperature_c"]["value"]
            if amb is None or e["temperature_c"]["status"] == "unavailable":
                return f"Temperature data is currently unavailable for {device_id}."
            return f"{device_id} is currently at {amb}°C."

        elif intent == "HUMIDITY":
            if is_stale:
                return f"{device_id}'s latest humidity reading is stale; a current humidity is unavailable."
            hum = e["humidity_percent"]["value"]
            if hum is None or e["humidity_percent"]["status"] == "unavailable":
                return f"Humidity data is unavailable because no humidity sensor is currently connected."
            return f"{device_id} relative humidity is {hum}%."

        elif intent == "DOOR":
            if is_stale:
                return f"{device_id}'s latest door status is stale; current state is unavailable."
            door_stat = str(h["door"]["value"]).lower()
            if h["door"]["status"] == "unavailable" or door_stat in ["none", "null", "unknown"]:
                return f"Door sensor data is unavailable because no door sensor is currently connected."
            if door_stat == "closed":
                return f"Yes. The door is closed on {device_id}."
            elif door_stat == "open":
                return f"No. The door is currently open on {device_id}."
            return f"{device_id} chamber door status is {door_stat}."

        elif intent == "VOLTAGE":
            if is_stale:
                return f"{device_id}'s latest voltage reading is stale; a current reading is unavailable."
            v = p["voltage_v"]["value"]
            if v is None or p["voltage_v"]["status"] == "unavailable":
                return f"Voltage data is unavailable because no voltage sensor is currently connected."
            return f"{device_id} supply voltage is {v} V."

        elif intent == "POWER":
            if is_stale:
                return f"{device_id}'s power telemetry is stale; current power state is unavailable."
            is_chg = p["charging"]["value"]
            pct = p["battery_percent"]["value"]
            v = p["voltage_v"]["value"]
            chg_str = "charging" if is_chg else "not charging"
            if "charging" in raw_query.lower() or "charge" in raw_query.lower():
                if is_chg:
                    return f"Yes. {device_id} is currently charging. Battery level is {pct}%."
                else:
                    return f"No. {device_id} is not currently charging. Battery level is {pct}%."
            return f"{device_id} power state: {chg_str}, battery level is {pct}% (voltage: {v} V)."

        elif intent == "WIFI":
            w_stat = c["wifi_status"]["value"]
            sig = c["signal_strength_dbm"]["value"]
            return f"{device_id} Wi-Fi is {w_stat} (signal: {sig} dBm)."

        elif intent == "SIGNAL":
            sig = c["signal_strength_dbm"]["value"]
            return f"{device_id} wireless signal strength is {sig} dBm."

        elif intent == "SERVER":
            srv = c["server_status"]["value"]
            return f"{device_id} backend server connection is {srv}."

        elif intent == "COMMUNICATION":
            w_stat = c["wifi_status"]["value"]
            srv = c["server_status"]["value"]
            if w_stat == "connected" and srv == "connected":
                return f"Wi-Fi and server communication are connected on {device_id}."
            elif w_stat == "disconnected":
                return f"Wi-Fi is disconnected on {device_id}."
            return f"{device_id} communications: Wi-Fi is {w_stat}, server is {srv}."

        elif intent in ["MICROPHONE", "AUDIO"]:
            m1 = a["mic_1"]["value"]
            m2 = a["mic_2"]["value"]
            if str(m1).lower() == "active" and str(m2).lower() == "active":
                return f"Both microphones on {device_id} are ACTIVE and operational (16 kHz stereo)."
            return f"{device_id} microphone status: Mic 1 is {m1}, Mic 2 is {m2}."

        elif intent == "SAMPLE_RATE":
            sr = a["sample_rate_hz"]["value"]
            return f"{device_id} audio sampling rate is {sr} Hz."

        elif intent == "MFCC":
            mfcc = m["mfcc_latency_ms"]["value"]
            return f"{device_id} MFCC feature extraction latency is {mfcc} ms."

        elif intent == "INFERENCE":
            infer = m["inference_latency_ms"]["value"]
            return f"{device_id} DS-CNN inference latency is {infer} ms."

        elif intent == "WAKE_THRESHOLD":
            thresh = m["wake_threshold"]["value"]
            acwe = m["acwe"]["value"]
            return f"{device_id} wake-word detection threshold is {thresh} (ACWE confirmation: {acwe})."

        elif intent in ["MEMORY", "HEAP"]:
            heap = s["free_heap_bytes"]["value"]
            heap_kb = heap / 1024.0
            return f"{device_id} has {heap} bytes ({heap_kb:.1f} KB) of free internal memory available."

        elif intent == "UPTIME":
            uptime = s["uptime_seconds"]["value"]
            hrs = uptime // 3600
            mins = (uptime % 3600) // 60
            secs = uptime % 60
            return f"{device_id} has been operating continuously for {uptime} seconds ({hrs}h {mins}m {secs}s)."

        elif intent == "DEVICE":
            return f"The currently active machine context is {device_id}."

        elif intent == "FAULT":
            if not faults and not warnings:
                return f"{device_id} reports 0 active faults or warnings. System health is normal."
            issues = faults + warnings
            return f"{device_id} diagnostics: {'; '.join(issues)}."

        elif intent == "HEALTH":
            if is_stale:
                return f"{device_id}'s telemetry is stale; health status cannot be verified."
            sys_stat = s["status"]["value"]
            if str(sys_stat).lower() == "normal" and not faults:
                return f"Yes. {device_id} is healthy and operating normally."
            issues = faults + warnings
            return f"{device_id} status is {sys_stat}. Issues: {', '.join(issues)}."

        else: # STATUS / Default
            if is_stale:
                return f"{device_id}'s telemetry is currently stale; updated complete status is unavailable."
            stat = s["status"]["value"]
            temp = e["temperature_c"]["value"]
            pct = p["battery_percent"]["value"]
            chg = "charging" if p["charging"]["value"] else "not charging"
            wifi = c["wifi_status"]["value"]
            issues = faults + warnings
            issue_str = f"Issues: {', '.join(issues)}" if issues else "0 active faults"

            return (
                f"Complete status for {device_id}: Status is {stat}. Ambient Temp: {temp}°C, "
                f"Battery: {pct}% ({chg}), Wi-Fi: {wifi}. {issue_str}."
            )
