import streamlit as st
from auth_ui import login_ui, signup_ui
from utils.api_client import (
    fetch_cpu, fetch_memory, fetch_disk,
    fetch_network_rx, fetch_network_tx, fetch_containers
)
from components.chart_panel import show_chart
from components.sidebar import sidebar_menu

# ---------------------------
# PAGE CONFIG (ALWAYS FIRST)
# ---------------------------
st.set_page_config(page_title="DevOps Monitoring Dashboard", layout="wide")

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

st.title("📊 DevOps Monitoring Dashboard (Streamlit)")

# CPU
cpu_data = fetch_cpu()
show_chart(cpu_data, "CPU (avg rate)")

# Memory
mem_data = fetch_memory()
show_chart(mem_data, "Memory Usage (%)")

# Disk
disk_data = fetch_disk()
show_chart(disk_data, "Disk Usage (%)")

# Network
rx_data = fetch_network_rx()
show_chart(rx_data, "Network RX (bytes/s)")

tx_data = fetch_network_tx()
show_chart(tx_data, "Network TX (bytes/s)")

# Containers
container_metrics = fetch_containers()
for container in container_metrics:
    show_chart(container["values"], f"Container CPU: {container['name']}")
