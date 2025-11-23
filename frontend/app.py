import streamlit as st
from utils.api_client import (
    fetch_cpu, fetch_memory, fetch_disk,
    fetch_network_rx, fetch_network_tx, fetch_containers
)
from components.chart_panel import show_chart
from components.sidebar import sidebar_menu

st.set_page_config(page_title="DevOps Monitoring Dashboard", layout="wide")

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
