import os, requests, time

PROM_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

class PromClient:
    def __init__(self, base=PROM_URL):
        self.base = base.rstrip("/")

    def query(self, query):
        r = requests.get(f"{self.base}/api/v1/query", params={"query": query}, timeout=10)
        r.raise_for_status()
        return r.json()

    def query_range(self, query, start=None, end=None, step='15s'):
        if not end:
            end = int(time.time())
        if not start:
            start = end - 3600  # last hour default
        params = {"query": query, "start": start, "end": end, "step": step}
        r = requests.get(f"{self.base}/api/v1/query_range", params=params, timeout=15)
        r.raise_for_status()
        return r.json()

