from fastapi import APIRouter, HTTPException, Depends
from app.services.prometheus_client import PromClient
from app.api.auth import create_access_token, get_current_user
from app.db.database import SessionLocal
from app.db.models import User
from app.api.security import hash_password, verify_password
from pydantic import BaseModel
import psutil

router = APIRouter()
client = PromClient()

class SignupRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str


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
# CONTAINER LIST (cAdvisor)
# ---------------------
@router.get("/metrics/containers")
def container_list(current_user: str = Depends(get_current_user)):
    """Get list of running containers with basic stats"""
    try:
        # Use irate for more accurate real-time CPU usage
        # Filter out empty container names and POD containers
        cpu_query = 'sum(irate(container_cpu_usage_seconds_total{name!="",name!~".*POD.*"}[2m])) by (name) * 100'
        mem_query = 'container_memory_usage_bytes{name!="",name!~".*POD.*"}'
        
        cpu_res = client.query(cpu_query)
        mem_res = client.query(mem_query)
        
        containers = {}
        
        # Process Memory data first (more reliable)
        for result in mem_res.get("data", {}).get("result", []):
            name = result.get("metric", {}).get("name", "")
            if not name or name == "":
                continue
            try:
                mem_bytes = float(result["value"][1])
                mem_mb = mem_bytes / (1024 * 1024)
                containers[name] = {"name": name, "cpu": 0.0, "memory": round(mem_mb, 2)}
            except (IndexError, ValueError, KeyError):
                continue
        
        # Process CPU data
        for result in cpu_res.get("data", {}).get("result", []):
            name = result.get("metric", {}).get("name", "")
            if not name or name == "":
                continue
            try:
                cpu = float(result["value"][1])
                if name in containers:
                    containers[name]["cpu"] = round(cpu, 2)
                else:
                    containers[name] = {"name": name, "cpu": round(cpu, 2), "memory": 0.0}
            except (IndexError, ValueError, KeyError):
                continue
        
        # Filter out containers with no meaningful data
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
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    """Get container CPU usage over time"""
    q = 'sum(rate(container_cpu_usage_seconds_total{name!=""}[1m])) by (name) * 100'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# CONTAINER MEMORY USAGE (cAdvisor)
# ---------------------
@router.get("/metrics/container_memory")
def container_memory(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    """Get container memory usage over time (in MB)"""
    q = 'container_memory_usage_bytes{name!=""} / 1024 / 1024'
    return client.query_range_for_chart(q, start=start, end=end, step=step)


# ---------------------
# PROCESS MANAGER (using psutil)
# ---------------------
@router.get("/processes/list")
def list_running_processes(current_user: str = Depends(get_current_user)):
    """List running processes with details using psutil"""
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_info']):
        try:
            pinfo = proc.info
            mem_mb = pinfo['memory_info'].rss / (1024 * 1024) if pinfo['memory_info'] else 0
            processes.append({
                "pid": pinfo['pid'],
                "name": pinfo['name'] or "Unknown",
                "user": pinfo['username'] or "Unknown",
                "cpu": pinfo['cpu_percent'] or 0,
                "memory": round(mem_mb, 2)
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    
    # Sort by CPU usage and return top 30
    processes.sort(key=lambda x: x['cpu'], reverse=True)
    return {"processes": processes[:30]}


@router.post("/processes/stop/{pid}")
def stop_process(pid: int, current_user: str = Depends(get_current_user)):
    """Stop a specific process by PID with safety checks"""
    # Safety check: prevent stopping critical system processes
    if pid <= 1:
        raise HTTPException(status_code=400, detail="Cannot stop system critical process (PID <= 1)")
    
    try:
        proc = psutil.Process(pid)
        proc_name = proc.name()
        proc.terminate()  # Graceful termination
        return {"message": f"Process {pid} ({proc_name}) termination signal sent", "success": True}
    except psutil.NoSuchProcess:
        raise HTTPException(status_code=404, detail=f"Process {pid} not found")
    except psutil.AccessDenied:
        raise HTTPException(status_code=403, detail=f"Permission denied to stop process {pid}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/signup")
def signup(data: SignupRequest):
    db = SessionLocal()
    username = data.username
    password = data.password

    if not username or not password:
        db.close()
        raise HTTPException(status_code=400, detail="Missing fields")

    if db.query(User).filter(User.username == username).first():
        db.close()
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=username,
        hashed_password=hash_password(password)
    )
    db.add(user)
    db.commit()
    db.close()

    return {"message": "User created successfully"}

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
    db.close()
    return {"access_token": token, "token_type": "bearer"}
