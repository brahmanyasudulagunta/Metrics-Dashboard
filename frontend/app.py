import streamlit as st
from auth_ui import login_ui, signup_ui
from utils.api_client import (
    fetch_cpu, fetch_memory, fetch_disk,
    fetch_network_rx, fetch_network_tx, fetch_containers
)
from components.chart_panel import show_chart
from components.sidebar import sidebar_menu
import time

# ---------------------------
# PAGE CONFIG (ALWAYS FIRST)
# ---------------------------
st.set_page_config(page_title="DevOps Monitoring Dashboard", layout="wide", initial_sidebar_state="expanded")

# ---------------------------
# AUTH SESSION INIT (ADD HERE)
# ---------------------------
if "logged_in" not in st.session_state:
    st.session_state.logged_in = False

if "token" not in st.session_state:
    st.session_state.token = None

# ---------------------------
# AUTH GATE (ADD HERE)
# ---------------------------
if not st.session_state.logged_in:
    st.title("🔐 DevOps Dashboard Login")

    tab1, tab2 = st.tabs(["Login", "Signup"])
    with tab1:
        login_ui()
    with tab2:
        signup_ui()

    st.stop()   # ⛔ stop dashboard loading

# ---------------------------
# DASHBOARD (ONLY AFTER LOGIN)
# ---------------------------
sidebar_menu()

st.title("📊 DevOps Monitoring Dashboard")

# Add refresh button and last update time
col1, col2 = st.columns([4, 1])
with col1:
    st.markdown("### System Metrics")
with col2:
    if st.button("🔄 Refresh"):
        st.rerun()

# Fetch all data
with st.spinner("⏳ Loading metrics..."):
    cpu_data = fetch_cpu()
    mem_data = fetch_memory()
    disk_data = fetch_disk()
    rx_data = fetch_network_rx()
    tx_data = fetch_network_tx()

# Display metric cards with current values
st.markdown("#### Key Metrics")
metric_col1, metric_col2, metric_col3 = st.columns(3)

with metric_col1:
    cpu_val = cpu_data[-1]["v"] if cpu_data else 0
    st.metric("🔴 CPU Usage", f"{cpu_val:.1f}%", delta=None)

with metric_col2:
    mem_val = mem_data[-1]["v"] if mem_data else 0
    st.metric("💾 Memory Usage", f"{mem_val:.1f}%", delta=None)

with metric_col3:
    disk_val = disk_data[-1]["v"] if disk_data else 0
    st.metric("💿 Disk Usage", f"{disk_val:.1f}%", delta=None)

# Display charts in tabs
tab1, tab2, tab3 = st.tabs(["System", "Network", "Containers"])

with tab1:
    col1, col2 = st.columns(2)
    with col1:
        show_chart(cpu_data, "CPU (avg rate)")
    with col2:
        show_chart(mem_data, "Memory Usage (%)")
    
    col1, col2 = st.columns(2)
    with col1:
        show_chart(disk_data, "Disk Usage (%)")

with tab2:
    col1, col2 = st.columns(2)
    with col1:
        show_chart(rx_data, "Network RX (bytes/s)")
    with col2:
        show_chart(tx_data, "Network TX (bytes/s)")

with tab3:
    st.markdown("### Containers")
    container_metrics = fetch_containers()

    # Helper: human-readable bytes
    def human_readable_bytes(n):
        try:
            n = float(n)
        except Exception:
            return "-"
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if abs(n) < 1024.0:
                return f"{n:3.1f} {unit}"
            n /= 1024.0
        return f"{n:.1f} PB"

    if not container_metrics:
        st.warning("No container data available")
    else:
        total = len(container_metrics)
        st.metric("Total containers", str(total))

        # Build a simple table: Name | Has Data | Latest Memory
        rows = []
        for c in container_metrics:
            name = c.get("name") or "Unknown"
            values = c.get("values") or []
            latest = values[-1]["v"] if values else None
            rows.append({
                "Name": name,
                "Has data": "Yes" if latest is not None else "No",
                "Latest (mem)": human_readable_bytes(latest) if latest is not None else "-"
            })

        st.table(rows)
