from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router as api_router
from api.k8s import router as k8s_router
from prometheus_fastapi_instrumentator import Instrumentator
from db.init_db import init_db
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="DevOps Monitoring Backend")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(k8s_router, prefix="/api")

@app.get("/")
def root():
    return {"status":"ok"}

instrumentator = Instrumentator(should_group_status_codes=False)
instrumentator.instrument(app).expose(app, endpoint="/metrics")
