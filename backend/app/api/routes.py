from fastapi import APIRouter, HTTPException, Depends
from app.services.prometheus_client import PromClient
from fastapi import BackgroundTasks
from app.api.auth import get_current_user, create_access_token

router = APIRouter()

@router.post("/login")
def login(form_data: dict):
    # Very simple: in prod, check db
    username = form_data.get("username")
    password = form_data.get("password")
    if username == "admin" and password == "admin":
        token = create_access_token({"sub": username})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/cpu")
def get_cpu_metrics():
    query = 'avg(rate(node_cpu_seconds_total{mode!="idle"}[5m]))'
    return prom.query_range(query)

