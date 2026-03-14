from fastapi import APIRouter, Depends
from services.prometheus_client import PromClient
from api.auth import get_current_user

router = APIRouter()
client = PromClient()

@router.get("/metrics/cpu")
def cpu_usage(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    try:
        q = '100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
        return client.query_range_for_chart(q, start=start, end=end, step=step)
    except Exception:
        return []

@router.get("/metrics/memory")
def memory_usage(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    try:
        q = '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
        return client.query_range_for_chart(q, start=start, end=end, step=step)
    except Exception:
        return []

@router.get("/metrics/disk")
def disk_usage(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    try:
        q = """
        100 - (
            node_filesystem_free_bytes{fstype!~"tmpfs|fuse.lxcfs|overlay"} /
            node_filesystem_size_bytes{fstype!~"tmpfs|fuse.lxcfs|overlay"} * 100
        )
        """
        return client.query_range_for_chart(q, start=start, end=end, step=step)
    except Exception:
        return []

@router.get("/metrics/network_rx")
def network_rx(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    try:
        q = 'irate(node_network_receive_bytes_total{device!="lo"}[1m])'
        return client.query_range_for_chart(q, start=start, end=end, step=step)
    except Exception:
        return []

@router.get("/metrics/network_tx")
def network_tx(
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    try:
        q = 'irate(node_network_transmit_bytes_total{device!="lo"}[1m])'
        return client.query_range_for_chart(q, start=start, end=end, step=step)
    except Exception:
        return []

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

@router.get("/metrics/temperature")
def system_temperature(current_user: str = Depends(get_current_user)):
    """Get system temperature if available"""
    try:
        queries = [
            'node_hwmon_temp_celsius{label="Package id 0"}',
            'node_hwmon_temp_celsius{label="core_0"}',
            'node_hwmon_temp_celsius{sensor="temp1"}',
            'avg(node_hwmon_temp_celsius)'
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
@router.get("/metrics/system")
def system_check(current_user: str = Depends(get_current_user)):
    """Simple endpoint for token validation"""
    return {"status": "ok", "message": "System authenticated"}
