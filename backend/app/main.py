from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from prometheus_fastapi_instrumentator import Instrumentator
from app.db.init_db import init_db
import os

app = FastAPI(title="DevOps Monitoring Backend")

init_db() 

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
