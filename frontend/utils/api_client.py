import os
import requests
import streamlit as st
from datetime import datetime


BACKEND = os.getenv("BACKEND_URL", "http://localhost:8000")

def auth_headers():
    token = st.session_state.get("token")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}

# ------------------------
# UNIT CONVERSION (bytes → KB/MB/GB)
# ------------------------
def convert_bytes(value):
    value = float(value)
    if value < 1024:
        return value, "B/s"
    elif value < 1024 ** 2:
        return value / 1024, "KB/s"
    elif value < 1024 ** 3:
        return value / (1024 ** 2), "MB/s"
    else:
        return value / (1024 ** 3), "GB/s"


# ------------------------
# MAIN FORMAT FUNCTION
# ------------------------
def format_series(values, unit=None, convert=False):
    formatted = []

    for ts, val in values:
        val = float(val)

        if convert:
            new_val, new_unit = convert_bytes(val)
            formatted.append({
                "t": datetime.fromtimestamp(ts),
                "v": new_val,
                "unit": new_unit
            })
        else:
            formatted.append({
                "t": datetime.fromtimestamp(ts),
                "v": val,
                "unit": unit
            })

    return formatted


# ------------------------
# CPU (%)
# ------------------------
def fetch_cpu():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/cpu", headers=auth_headers())
        res = r.json()
        pts = res["data"]["result"][0]["values"]
        return format_series(pts, unit="%")
    except Exception as e:
        print("CPU error:", e)
        return []


# ------------------------
# MEMORY (%)
# ------------------------
def fetch_memory():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/memory", headers=auth_headers())
        res = r.json()
        pts = res["data"]["result"][0]["values"]
        return format_series(pts, unit="%")
    except Exception as e:
        print("Memory error:", e)
        return []


# ------------------------
# DISK (%)
# ------------------------
def fetch_disk():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/disk", headers=auth_headers())
        res = r.json()
        pts = res["data"]["result"][0]["values"]
        return format_series(pts, unit="%")
    except Exception as e:
        print("Disk error:", e)
        return []


# ------------------------
# NETWORK RX (converted bytes → MB/s, etc.)
# ------------------------
def fetch_network_rx():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/network_rx", headers=auth_headers())
        res = r.json()
        values = res["data"]["result"][0]["values"]
        return format_series(values, convert=True)
    except Exception as e:
        print("Network RX error:", e)
        return []


# ------------------------
# NETWORK TX (converted bytes → MB/s, etc.)
# ------------------------
def fetch_network_tx():
    try:
        r = requests.get(f"{BACKEND}/api/metrics/network_tx", headers=auth_headers())
        res = r.json()
        values = res["data"]["result"][0]["values"]
        return format_series(values, convert=True)
    except Exception as e:
        print("Network TX error:", e)
        return []

