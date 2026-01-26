# app/services/prometheus_client.py (extend)
import os, requests, time
from datetime import datetime

PROM_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

class PromClient:
    def __init__(self, base=PROM_URL):
        self.base = base.rstrip("/")

    def _req(self, path, params):
        r = requests.get(f"{self.base}{path}", params=params, timeout=15)
        r.raise_for_status()
        return r.json()

    def query(self, query):
        return self._req("/api/v1/query", {"query": query})

    def query_range(self, query, start=None, end=None, step='15s'):
        if not end:
            end = int(time.time())
        if not start:
            start = end - 3600
        params = {"query": query, "start": start, "end": end, "step": step}
        return self._req("/api/v1/query_range", params)

    def query_range_values(self, query, start=None, end=None, step='15s'):
        res = self.query_range(query, start, end, step)
        # returns values array if single result else aggregated empty
        try:
            return res["data"]["result"][0]["values"]
        except Exception:
            return []

    def query_range_for_chart(self, query, start=None, end=None, step='15s'):
        """Transform Prometheus data to chart-friendly format: [{time: str, value: float}]"""
        res = self.query_range(query, start, end, step)
        try:
            values = res["data"]["result"][0]["values"]
            return [
                {
                    "time": datetime.fromtimestamp(ts).strftime("%H:%M"),
                    "value": float(val)
                }
                for ts, val in values
            ]
        except Exception:
            return []

    def query_range_result_like_prom(self, resp_query, start=None, end=None, step='15s', default_to_empty=False):
        # Return JSON formatted like Prometheus query_range result -> frontend expects data.result[].values
        res = self.query_range(resp_query, start, end, step)
        if default_to_empty and (not res.get("data", {}).get("result")):
            return {"data": {"result": []}}
        return res
