from fastapi import APIRouter, HTTPException
from app.services.prometheus_client import PromClient
from app.api.auth import create_access_token
from fastapi import BackgroundTasks

router = APIRouter()
client = PromClient()

# ---------------------
# LOGIN
# ---------------------
@router.post("/login")
def login(form_data: dict):
    username = form_data.get("username")
    password = form_data.get("password")

    if username == "admin" and password == "admin":
        token = create_access_token({"sub": username})
        return {"access_token": token, "token_type": "bearer"}

    raise HTTPException(status_code=401, detail="Invalid credentials")


# ---------------------
# CPU USAGE
# ---------------------
@router.get("/metrics/cpu")
def cpu_usage():
    q = '100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
    return client.query_range_result_like_prom(q)


# ---------------------
# MEMORY USAGE
# ---------------------
@router.get("/metrics/memory")
def memory_usage():
    q = '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
    return client.query_range_result_like_prom(q)


# ---------------------
# DISK USAGE
# ---------------------
@router.get("/metrics/disk")
def disk_usage():
    q = """
    100 - (
        node_filesystem_free_bytes{fstype!~"tmpfs|fuse.lxcfs|overlay"} /
        node_filesystem_size_bytes{fstype!~"tmpfs|fuse.lxcfs|overlay"} * 100
    )
    """
    return client.query_range_result_like_prom(q)


# ---------------------
# NETWORK RX
# ---------------------
@router.get("/metrics/network_rx")
def network_rx():
    q = 'irate(node_network_receive_bytes_total{device!="lo"}[1m])'
    return client.query_range_result_like_prom(q)


# ---------------------
# NETWORK TX
# ---------------------
@router.get("/metrics/network_tx")
def network_tx():
    q = 'irate(node_network_transmit_bytes_total{device!="lo"}[1m])'
    return client.query_range_result_like_prom(q)


# ---------------------
# CONTAINER COUNT (cAdvisor)
# ---------------------
@router.get("/metrics/containers")
def container_count():
    q = 'count(container_memory_usage_bytes)'
    return client.query_range_result_like_prom(q)
