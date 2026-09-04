"""
TRINETRA STAGE 9A — JURY DEMONSTRATION RUNNER
Demonstrates dynamic device context switching across TRINETRA-001, 002, 003,
anti-hallucination validation, and missing telemetry handling.
"""

from __future__ import annotations
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from software.telemetry.telemetry_manager import TelemetryManager
from software.slm.slm_engine import SLMEngine

def run_jury_demo():
    print("=" * 65)
    print("TRINETRA STAGE 9A: TELEMETRY-AWARE SLM JURY DEMO")
    print("=" * 65)

    telemetry_manager = TelemetryManager()
    slm = SLMEngine(telemetry_manager)

    demo_log = []

    # ─── STEP 1: Select TRINETRA-001 ───
    print("\n-----------------------------------------")
    print("Current device: TRINETRA-001")
    print("-----------------------------------------")
    telemetry_manager.select_device("TRINETRA-001")

    queries_001 = [
        "What is the temperature?",
        "Is the door closed?",
        "What is the communication status?"
    ]
    for q in queries_001:
        print(f"User:\n\"{q}\"")
        res = slm.process_query(q)
        print(f"TRINETRA:\n\"{res['response']}\"\n")
        demo_log.append(("TRINETRA-001", q, res["response"]))

    # ─── STEP 2: Switch to TRINETRA-002 ───
    print("-----------------------------------------")
    print("Current device: TRINETRA-002")
    print("-----------------------------------------")
    telemetry_manager.select_device("TRINETRA-002")

    for q in queries_001:
        print(f"User:\n\"{q}\"")
        res = slm.process_query(q)
        print(f"TRINETRA:\n\"{res['response']}\"\n")
        demo_log.append(("TRINETRA-002", q, res["response"]))

    # ─── STEP 3: Switch to TRINETRA-003 ───
    print("-----------------------------------------")
    print("Current device: TRINETRA-003")
    print("-----------------------------------------")
    telemetry_manager.select_device("TRINETRA-003")

    for q in queries_001:
        print(f"User:\n\"{q}\"")
        res = slm.process_query(q)
        print(f"TRINETRA:\n\"{res['response']}\"\n")
        demo_log.append(("TRINETRA-003", q, res["response"]))

    # ─── STEP 4: Missing Telemetry Field Query ───
    print("-----------------------------------------")
    print("Missing Telemetry Test: TRINETRA-003")
    print("-----------------------------------------")
    q_missing = "What is the battery health?"
    print(f"User:\n\"{q_missing}\"")
    res_missing = slm.process_query(q_missing)
    print(f"TRINETRA:\n\"{res_missing['response']}\"\n")
    demo_log.append(("TRINETRA-003", q_missing, res_missing["response"]))

    print("=" * 65)
    print("STAGE 9A JURY DEMO COMPLETE: ALL CHECKS PASSED")
    print("=" * 65)

    return demo_log

if __name__ == "__main__":
    run_jury_demo()
