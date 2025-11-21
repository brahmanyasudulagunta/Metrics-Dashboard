import os
import requests
from datetime import datetime

BACKEND = os.getenv("BACKEND_URL", "http://localhost:8000")

def format_series(values):
    return [
        {"t": datetime.fromtimestamp(v[0]), "v": float(v[1])}
        for v in values
    ]

def fetch_cpu():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/cpu")
        res = r.json()
        pts = res["data"]["result"][0]["values"]
        return format_series(pts)
    except:
        return []

def fetch_memory():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/memory")
        res = r.json()
        pts = res["data"]["result"][0]["values"]
        return format_series(pts)
    except:
        return []

def fetch_disk():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/disk")
        res = r.json()
        pts = res["data"]["result"][0]["values"]
        return format_series(pts)
    except:
        return []

def fetch_network():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/network")
        res = r.json()

        rx = [x for x in res["data"]["result"] if x["metric"].get("name") == "network_rx"]
        tx = [x for x in res["data"]["result"] if x["metric"].get("name") == "network_tx"]

        rx_vals = format_series(rx[0]["values"]) if rx else []
        tx_vals = format_series(tx[0]["values"]) if tx else []

        return rx_vals, tx_vals
    except:
        return [], []

def fetch_containers():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/containers")
        res = r.json()

        formatted = []
        for container in res["data"]["result"]:
            formatted.append({
                "name": container["metric"]["container_name"],
                "values": format_series(container["values"])
            })
        return formatted
    except:
        return []
