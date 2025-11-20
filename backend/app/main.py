from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from prometheus_fastapi_instrumentator import Instrumentator
import os

app = FastAPI(title="DevOps Monitoring Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock this down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {"status":"ok"}

@app.get("/cpu")
def get_cpu():
    # Prometheus query for average CPU usage
    query = 'avg(rate(node_cpu_seconds_total{mode!="idle"}[5m]))'
    response = requests.get(f"{PROM_URL}/api/v1/query", params={"query": query})
    data = response.json()
    # Extract value
    try:
        value = data['data']['result'][0]['value'][1]
        return {"cpu_avg": float(value)}
    except (IndexError, KeyError):
        return {"cpu_avg": None, "message": "No data yet"}


instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app, endpoint="/metrics")
