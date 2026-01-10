from fastapi import APIRouter, HTTPException, Depends
from app.services.prometheus_client import PromClient
from app.api.auth import create_access_token, get_current_user
from fastapi import BackgroundTasks
from app.db.database import SessionLocal
from app.db.models import User
from app.api.security import hash_password, verify_password

router = APIRouter()
client = PromClient()


# ---------------------
# CPU USAGE
# ---------------------
@router.get("/metrics/cpu")
def cpu_usage(current_user: str = Depends(get_current_user)):
    q = '100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
    return client.query_range_result_like_prom(q)


# ---------------------
# MEMORY USAGE
# ---------------------
@router.get("/metrics/memory")
def memory_usage(current_user: str = Depends(get_current_user)):
    q = '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100'
    return client.query_range_result_like_prom(q)


# ---------------------
# DISK USAGE
# ---------------------
@router.get("/metrics/disk")
def disk_usage(current_user: str = Depends(get_current_user)):
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
def network_rx(current_user: str = Depends(get_current_user)):
    q = 'irate(node_network_receive_bytes_total{device!="lo"}[1m])'
    return client.query_range_result_like_prom(q)


# ---------------------
# NETWORK TX
# ---------------------
@router.get("/metrics/network_tx")
def network_tx(current_user: str = Depends(get_current_user)):
    q = 'irate(node_network_transmit_bytes_total{device!="lo"}[1m])'
    return client.query_range_result_like_prom(q)


# ---------------------
# CONTAINER MEMORY (cAdvisor)
# ---------------------
@router.get("/metrics/containers")
def container_count(current_user: str = Depends(get_current_user)):
    q = 'container_memory_usage_bytes'
    return client.query_range_result_like_prom(q)


@router.post("/signup")
def signup(data: dict):
    db = SessionLocal()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing fields")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=username,
        hashed_password=hash_password(password)
    )
    db.add(user)
    db.commit()

    return {"message": "User created successfully"}

@router.post("/login")
def login(data: dict):
    db = SessionLocal()
    username = data.get("username")
    password = data.get("password")

    user = db.query(User).filter(User.username == username).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": username})
    return {"access_token": token, "token_type": "bearer"}
