"""Simple load test for LegalFlow API."""
import concurrent.futures
import time
import urllib.request
import json

URL = "https://legalflow-production-b834.up.railway.app/health"


def check_health(n):
    try:
        start = time.time()
        req = urllib.request.Request(URL)
        with urllib.request.urlopen(req, timeout=10) as resp:
            elapsed = time.time() - start
            return (n, resp.status, elapsed, json.loads(resp.read()))
    except Exception as e:
        return (n, None, 0, str(e))


def run_test(concurrent: int = 10, rounds: int = 3):
    print(f"Load test: {concurrent} concurrent x {rounds} rounds")
    for r in range(rounds):
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent) as executor:
            futures = [executor.submit(check_health, i) for i in range(concurrent)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        ok = sum(1 for r in results if r[1] == 200)
        times = [r[2] for r in results if r[2] > 0]
        avg = sum(times) / len(times) if times else 0
        print(f"  Round {r+1}: {ok}/{concurrent} OK, avg {avg:.3f}s")
    print("Done!")


if __name__ == "__main__":
    run_test(concurrent=10, rounds=3)
