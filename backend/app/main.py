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

instrumentator = Instrumentator(should_group_status_codes=False)
instrumentator.instrument(app).expose(app, endpoint="/metrics")
