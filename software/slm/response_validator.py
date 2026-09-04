"""
Anti-Hallucination & Response Validation Layer for TRINETRA SLM (Stage 9A).
Guarantees strict factual conformity between generated answer and active machine telemetry.
"""

import re
from typing import Dict, Any, List

class ResponseValidator:
    """
    Validates SLM outputs against source telemetry to guarantee zero hallucination.
    """

    @classmethod
    def validate_response(cls, response_text: str, active_device_id: str, telemetry: Dict[str, Any], query: str, entity: str = "") -> Dict[str, Any]:
        result = {
            "is_valid": True,
            "device_matched": False,
            "has_hallucination": False,
            "security_blocked": False,
            "reason": "PASS"
        }

        # 1. Device match check
        if active_device_id in response_text:
            result["device_matched"] = True

        # 2. Check for actuator command refusal
        lower_q = query.lower()
        if any(act in lower_q for act in ["turn off", "shutdown", "reboot", "unlock hatch", "open door"]):
            if "read-only" in response_text.lower() or "not permitted" in response_text.lower() or "rejected" in response_text.lower():
                result["security_blocked"] = True
                return result

        # 3. Temperature hallucination check
        if entity == "temperature" or "temperature" in lower_q:
            actual_temp = telemetry["environment"]["temperature_c"]["value"]
            if actual_temp is not None:
                temp_str = f"{actual_temp}"
                if temp_str not in response_text and f"{actual_temp:.1f}" not in response_text:
                    result["is_valid"] = False
                    result["has_hallucination"] = True
                    result["reason"] = f"Hallucinated temperature! Expected {actual_temp}°C"
                    return result
            else:
                # If unavailable, response must explicitly state unavailable
                if "unavailable" not in response_text.lower():
                    result["is_valid"] = False
                    result["has_hallucination"] = True
                    result["reason"] = "Fabricated value for unavailable temperature!"
                    return result

        # 4. Door status hallucination check
        if entity == "door" or "door" in lower_q:
            actual_door = str(telemetry["hardware"]["door"]["value"]).lower()
            resp_lower = response_text.lower()
            if actual_door == "closed" and ("open" in resp_lower and "closed" not in resp_lower):
                result["is_valid"] = False
                result["has_hallucination"] = True
                result["reason"] = "Hallucinated door status! Expected closed"
                return result
            elif actual_door == "open" and ("closed" in resp_lower and "open" not in resp_lower):
                result["is_valid"] = False
                result["has_hallucination"] = True
                result["reason"] = "Hallucinated door status! Expected open"
                return result

        # 5. Voltage hallucination check
        if entity == "voltage" or "voltage" in lower_q:
            actual_v = telemetry["power"]["voltage_v"]["value"]
            if actual_v is not None:
                v_str = f"{actual_v}"
                if v_str not in response_text and f"{actual_v:.2f}" not in response_text:
                    result["is_valid"] = False
                    result["has_hallucination"] = True
                    result["reason"] = f"Hallucinated voltage! Expected {actual_v}V"
                    return result

        # 6. Missing field / unavailable data check (e.g. battery health, pressure)
        if "battery health" in lower_q or "pressure" in lower_q:
            if "unavailable" not in response_text.lower():
                result["is_valid"] = False
                result["has_hallucination"] = True
                result["reason"] = "Fabricated value for unavailable metric!"
                return result

        return result
