from fastapi import APIRouter, HTTPException, Depends
from app.services.prometheus_client import PromClient
from app.api.auth import create_access_token, get_current_user
from fastapi import BackgroundTasks
from app.db.database import SessionLocal
from app.db.models import User
from app.api.security import hash_password, verify_password
from pydantic import BaseModel

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
