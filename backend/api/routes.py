import os
import logging
from fastapi import APIRouter, HTTPException, Depends
from services.prometheus_client import PromClient
from api.auth import create_access_token, get_current_user
from db.database import SessionLocal
from db.models import User
from api.security import hash_password, verify_password
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()
client = PromClient()

# Detect runtime: in K8s, use container/pod labels; in Docker, use name label
IS_K8S = os.getenv("K8S_MODE", "auto") == "incluster"

try:
    from services.docker_client import get_container_logs, get_container_processes
    HAS_DOCKER = True
except Exception:
    HAS_DOCKER = False

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    new_password: str



# ---------------------
# CPU USAGE
# ---------------------
@router.get("/metrics/cpu")
def cpu_usage(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    q = '100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# MEMORY USAGE
# ---------------------
@router.get("/metrics/memory")
def memory_usage(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    q = '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# DISK USAGE
# ---------------------
@router.get("/metrics/disk")
def disk_usage(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    q = """
    100 - (
        node_filesystem_free_bytes{fstype!~"tmpfs|fuse.lxcfs|overlay"} /
        node_filesystem_size_bytes{fstype!~"tmpfs|fuse.lxcfs|overlay"} * 100
    )
    """
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# NETWORK RX
# ---------------------
@router.get("/metrics/network_rx")
def network_rx(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    q = 'irate(node_network_receive_bytes_total{device!="lo"}[1m])'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# NETWORK TX
# ---------------------
@router.get("/metrics/network_tx")
def network_tx(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    q = 'irate(node_network_transmit_bytes_total{device!="lo"}[1m])'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# SYSTEM UPTIME
# ---------------------
@router.get("/metrics/uptime")
def system_uptime(current_user: str = Depends(get_current_user)):
    q = 'node_time_seconds - node_boot_time_seconds'
    try:
        res = client.query(q)
        uptime_seconds = float(res["data"]["result"][0]["value"][1])
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        return {"uptime": f"{days}d {hours}h {minutes}m", "seconds": uptime_seconds}
    except Exception:
        return {"uptime": "N/A", "seconds": 0}


# ---------------------
# LOAD AVERAGE
# ---------------------
@router.get("/metrics/load")
def load_average(current_user: str = Depends(get_current_user)):
    try:
        load1 = client.query('node_load1')["data"]["result"][0]["value"][1]
        load5 = client.query('node_load5')["data"]["result"][0]["value"][1]
        load15 = client.query('node_load15')["data"]["result"][0]["value"][1]
        return {
            "load1": round(float(load1), 2),
            "load5": round(float(load5), 2),
            "load15": round(float(load15), 2)
        }
    except Exception:
        return {"load1": 0, "load5": 0, "load15": 0}


# ---------------------
# PROCESS COUNT
# ---------------------
@router.get("/metrics/processes")
def process_count(current_user: str = Depends(get_current_user)):
    try:
        res = client.query('node_procs_running')
        running = int(float(res["data"]["result"][0]["value"][1]))
        res_blocked = client.query('node_procs_blocked')
        blocked = int(float(res_blocked["data"]["result"][0]["value"][1]))
        return {"running": running, "blocked": blocked, "total": running + blocked}
    except Exception:
        return {"running": 0, "blocked": 0, "total": 0}


# ---------------------
# TEMPERATURE (Hardware)
# ---------------------
@router.get("/metrics/temperature")
def system_temperature(current_user: str = Depends(get_current_user)):
    """Get system temperature if available"""
    try:
        # Try to get CPU package or core temperature
        queries = [
            'node_hwmon_temp_celsius{label="Package id 0"}',  # Intel/AMD Package
            'node_hwmon_temp_celsius{label="core_0"}',       # Core 0
            'node_hwmon_temp_celsius{sensor="temp1"}',       # Generic temp1
            'avg(node_hwmon_temp_celsius)'                    # Average of all sensors
        ]
        
        for q in queries:
            try:
                res = client.query(q)
                if res.get("data", {}).get("result"):
                    temp = float(res["data"]["result"][0]["value"][1])
                    return {"value": round(temp, 1), "status": "Active", "available": True}
            except:
                continue
                
        return {"value": 0, "status": "No Sensors", "available": False}
    except Exception as e:
        return {"value": 0, "status": "Error", "available": False, "details": str(e)}


# ---------------------
# CONTAINER LIST (cAdvisor metrics)
# ---------------------
@router.get("/metrics/containers")
def container_list(current_user: str = Depends(get_current_user)):
    """Get container resource metrics (CPU/Memory).
    Docker mode: shows Docker containers. K8s mode: shows pod containers.
    """
    try:
        if IS_K8S:
            ns_exclude = 'namespace!~"kube-system|kube-public|kube-node-lease"'
            cpu_query = f'sum(irate(container_cpu_usage_seconds_total{{container!="",container!="POD",image!="",{ns_exclude}}}[2m])) by (container,pod,namespace) * 100'
            mem_query = f'sum(container_memory_usage_bytes{{container!="",container!="POD",image!="",{ns_exclude}}}) by (container,pod,namespace)'
        else:
            cpu_query = 'sum(irate(container_cpu_usage_seconds_total{name!="",name!~".*POD.*"}[2m])) by (name) * 100'
            mem_query = 'container_memory_usage_bytes{name!="",name!~".*POD.*"}'
        
        cpu_res = client.query(cpu_query)
        mem_res = client.query(mem_query)
        
        containers = {}
        
        for result in mem_res.get("data", {}).get("result", []):
            metric = result.get("metric", {})
            if IS_K8S:
                name = metric.get("container", "")
                pod = metric.get("pod", "")
                display = f"{name} ({pod})" if pod else name
                key = f"{metric.get('namespace','')}/{pod}/{name}"
            else:
                display = metric.get("name", "")
                key = display
            if not display:
                continue
            try:
                mem_bytes = float(result["value"][1])
                mem_mb = mem_bytes / (1024 * 1024)
                containers[key] = {"name": display, "cpu": 0.0, "memory": round(mem_mb, 2)}
            except (IndexError, ValueError, KeyError):
                continue
        
        for result in cpu_res.get("data", {}).get("result", []):
            metric = result.get("metric", {})
            if IS_K8S:
                name = metric.get("container", "")
                pod = metric.get("pod", "")
                display = f"{name} ({pod})" if pod else name
                key = f"{metric.get('namespace','')}/{pod}/{name}"
            else:
                display = metric.get("name", "")
                key = display
            if not display:
                continue
            try:
                cpu = float(result["value"][1])
                if key in containers:
                    containers[key]["cpu"] = round(cpu, 2)
                else:
                    containers[key] = {"name": display, "cpu": round(cpu, 2), "memory": 0.0}
            except (IndexError, ValueError, KeyError):
                continue
        
        valid_containers = [c for c in containers.values() if c["memory"] > 0 or c["cpu"] > 0]
        return {"containers": valid_containers}
    except Exception as e:
        return {"containers": [], "error": str(e)}


# ---------------------
# CONTAINER CPU USAGE (cAdvisor)
# ---------------------
@router.get("/metrics/container_cpu")
def container_cpu(
    current_user: str = Depends(get_current_user),
    container_name: str = None,
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    """Get container CPU usage over time"""
    if IS_K8S:
        ns_exclude = 'namespace!~"kube-system|kube-public|kube-node-lease"'
        if container_name:
            q = f'sum(rate(container_cpu_usage_seconds_total{{container="{container_name}",image!="",{ns_exclude}}}[1m])) by (container,pod) * 100'
        else:
            q = f'sum(rate(container_cpu_usage_seconds_total{{container!="",container!="POD",image!="",{ns_exclude}}}[1m])) by (container,pod) * 100'
    else:
        if container_name:
            q = f'sum(rate(container_cpu_usage_seconds_total{{name="{container_name}"}}[1m])) by (name) * 100'
        else:
            q = 'sum(rate(container_cpu_usage_seconds_total{name!=""}[1m])) by (name) * 100'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# CONTAINER MEMORY USAGE (cAdvisor)
# ---------------------
@router.get("/metrics/container_memory")
def container_memory(
    current_user: str = Depends(get_current_user),
    container_name: str = None,
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    """Get container memory usage over time (in MB)"""
    if IS_K8S:
        ns_exclude = 'namespace!~"kube-system|kube-public|kube-node-lease"'
        if container_name:
            q = f'sum(container_memory_usage_bytes{{container="{container_name}",image!="",{ns_exclude}}}) by (container,pod) / 1024 / 1024'
        else:
            q = f'sum(container_memory_usage_bytes{{container!="",container!="POD",image!="",{ns_exclude}}}) by (container,pod) / 1024 / 1024'
    else:
        if container_name:
            q = f'container_memory_usage_bytes{{name="{container_name}"}} / 1024 / 1024'
        else:
            q = 'container_memory_usage_bytes{name!=""} / 1024 / 1024'
    return client.query_range_for_chart(q, start=start, end=end, step=step)

# ---------------------
# CONTAINER LOGS (Live)
# ---------------------
@router.get("/metrics/container_logs")
def container_logs(
    container_name: str,
    tail: int = 200,
    current_user: str = Depends(get_current_user)
):
    """Get live logs for a specific container"""
    if HAS_DOCKER and not IS_K8S:
        logs = get_container_logs(container_name, tail)
        return {"logs": logs}
    else:
        return {"logs": "Container logs are available via the Kubernetes tab in K8s mode."}

# ---------------------
# CONTAINER PROCESSES (Live)
# ---------------------
@router.get("/metrics/container_processes")
def container_processes(
    container_name: str,
    current_user: str = Depends(get_current_user)
):
    """Get live processes (`docker top`) for a specific container"""
    if HAS_DOCKER and not IS_K8S:
        processes = get_container_processes(container_name)
        if isinstance(processes, dict) and "error" in processes:
            raise HTTPException(status_code=500, detail=processes["error"])
        return processes
    else:
        return {"titles": ["INFO"], "processes": [["Container processes available via kubectl exec in K8s mode."]]}


# ---------------------
# RAW PromQL EXPLORER
# ---------------------
@router.get("/metrics/query_range_raw")
def query_range_raw(
    query: str,
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    """Execute raw PromQL and return the raw Prometheus JSON response"""
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    try:
        # We use a helper from PromClient that returns the raw JSON 
        # instead of attempting to transform it, because custom queries 
        # can have completely unpredictable shapes (vectors, matrices, etc.)
        return client.query_range_result_like_prom(query, start=start, end=end, step=step)
    except Exception as e:
        error_msg = str(e)
        # Prometheus returns 400 for range vector selectors like metric[5m] in query_range
        if "400" in error_msg or "Bad Request" in error_msg:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid PromQL for range query. If using a range vector selector like [5m], wrap it in a function like rate() or irate(). Error: {error_msg}"
            )
        raise HTTPException(status_code=500, detail=error_msg)

@router.post("/login")
def login(data: LoginRequest):
    db = SessionLocal()
    username = data.username
    password = data.password

    user = db.query(User).filter(User.username == username).first()

    if not user or not verify_password(password, user.hashed_password):
        db.close()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": username})
    must_change = user.must_change_password if user.must_change_password else False
    db.close()
    return {"access_token": token, "token_type": "bearer", "must_change_password": must_change}


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: str = Depends(get_current_user)
):
    db = SessionLocal()
    user = db.query(User).filter(User.username == current_user).first()
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)
    user.must_change_password = False
    db.commit()
    db.close()
    return {"message": "Password updated successfully"}
