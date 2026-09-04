"""
TRINETRA Software Integration Verification Test
Tests the live Backend Express server and simulated pipeline end-to-end for single system TRINETRA-001.
"""
import urllib.request
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:3001"

def test_api():
    print("=" * 60)
    print("TRINETRA-001 SINGLE PHYSICAL SYSTEM INTEGRATION TESTS")
    print("=" * 60)

    # 1. Health check
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["status"] == "ok", "Backend health failed"
        assert data["device"] == "TRINETRA-001", "Expected TRINETRA-001"
        assert data["ground_ai"] == "available", "Expected ground_ai available"
        assert "gemini" in data["ground_model"].lower(), "Expected Gemini model"
        print(f"✅ Backend Health Check: OK (Device: TRINETRA-001, Ground AI: {data['ground_ai']}, Model: {data['ground_model']})")

    # 2. Grounded SLM Queries for TRINETRA-001 (Local SLM Layer)
    queries = [
        ("What is the temperature?", "28.4"),
        ("What is the free heap?", "410"),
        ("What is the CPU temperature?", "42.3"),
        ("Is the microphone active?", "active"),
        ("Is the communication link connected?", "connected")
    ]
    for q, expected_snippet in queries:
        payload = json.dumps({"query": q, "deviceId": "TRINETRA-001"}).encode()
        req = urllib.request.Request(f"{BASE_URL}/api/query", data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            ans = res["response"].lower()
            assert res["deviceId"] == "TRINETRA-001"
            assert expected_snippet.lower() in ans, f"Query '{q}' returned: {res['response']}, expected snippet '{expected_snippet}'"
            print(f"  [LOCAL SLM] '{q}' -> \"{res['response']}\" ✅")

    # 3. Test missing/unsupported field query (Local SLM Anti-hallucination check)
    payload = json.dumps({"query": "What is the cosmic radiation level?", "deviceId": "TRINETRA-001"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/query", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert "unavailable" in res["response"].lower() or "not available" in res["response"].lower() or "unsupported" in res["response"].lower()
        print(f"  [Local Anti-Hallucination] Unknown Metric Query -> \"{res['response']}\" ✅")

    # 4. Test Real Gemini Ground Fallback Endpoint: POST /api/ground/query
    ground_payload = json.dumps({
        "query": "Explain the communication protocol.",
        "device_id": "TRINETRA-001",
        "source": "GROUND_FALLBACK",
        "telemetry": {
            "device_id": "TRINETRA-001",
            "system": {"uptime": 18452, "free_heap": 410000, "cpu_temperature": 42.3},
            "communication": {"wifi": "connected", "server": "connected", "signal_strength": -61}
        }
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/ground/query", data=ground_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        ground_res = json.loads(resp.read().decode())
        assert ground_res["success"] is True, "Ground query should succeed"
        assert ground_res["device_id"] == "TRINETRA-001"
        assert ground_res["source"] == "GROUND_LLM"
        assert ground_res["status"] == "COMPLETED"
        assert len(ground_res["response"]) > 10
        print(f"  [GROUND LLM (GEMINI)] 'Explain the communication protocol.' -> \"{ground_res['response'][:90]}...\" ✅")

    # 5. Test Invalid Device ID Rejection
    invalid_dev_payload = json.dumps({"query": "Explain protocol.", "device_id": "TRINETRA-002"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/ground/query", data=invalid_dev_payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req)
        assert False, "Should have failed with 400"
    except urllib.error.HTTPError as e:
        assert e.code == 400
        print("  [DEVICE VALIDATION] Rejection of non-TRINETRA-001 device ID -> HTTP 400 ✅")

    print("\n✅ ALL TRINETRA-001 LOCAL SLM + GEMINI GROUND LLM TESTS PASSED (100%)!")

if __name__ == "__main__":
    test_api()
