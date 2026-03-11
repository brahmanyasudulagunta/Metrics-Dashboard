from fastapi import APIRouter, HTTPException, Depends
from services.k8s_client import K8sClient
from api.auth import get_current_user
from api.auth import create_access_token, get_current_user
from db.database import SessionLocal
from db.models import User
from api.security import hash_password, verify_password
from pydantic import BaseModel

import logging

logger = logging.getLogger(__name__)

router = APIRouter()
k8s = K8sClient()


@router.get("/metrics/namespaces")
def list_namespaces(current_user: str = Depends(get_current_user)):
    logger.info("Entering list_namespaces endpoint")
    data = k8s.get_namespaces()
    logger.info("Finished get_namespaces call")
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"namespaces": data}

@router.get("/metrics/pods")
def list_pods(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_pods(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"pods": data}


@router.get("/metrics/deployments")
def list_deployments(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_deployments(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"deployments": data}


@router.get("/metrics/services")
def list_services(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_services(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"services": data}


@router.get("/metrics/pods/{namespace}/{pod_name}/logs")
def get_pod_logs(
    namespace: str,
    pod_name: str,
    tail: int = 200,
    current_user: str = Depends(get_current_user)
):
    logs = k8s.get_pod_logs(name=pod_name, namespace=namespace, tail_lines=tail)
    return {"logs": logs}


@router.get("/metrics/events")
def list_events(
    namespace: str = "all",
    current_user: str = Depends(get_current_user)
):
    data = k8s.get_events(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"events": data}
