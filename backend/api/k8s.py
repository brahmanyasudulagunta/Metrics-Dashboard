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


class CreateNamespaceRequest(BaseModel):
    name: str

@router.get("/metrics/clusters")
def list_clusters(current_user: str = Depends(get_current_user)):
    data = k8s.get_clusters()
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"clusters": data}

@router.get("/metrics/nodes")
def list_nodes(current_user: str = Depends(get_current_user)):
    data = k8s.get_nodes()
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"nodes": data}


@router.get("/metrics/namespaces")
def list_namespaces(current_user: str = Depends(get_current_user)):
    logger.info("Entering list_namespaces endpoint")
    data = k8s.get_namespaces()
    logger.info("Finished get_namespaces call")
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"namespaces": data}

@router.post("/metrics/namespaces")
def create_namespace(req: CreateNamespaceRequest, current_user: str = Depends(get_current_user)):
    data = k8s.create_namespace(req.name)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data

@router.delete("/metrics/namespaces/{name}")
def delete_namespace(name: str, current_user: str = Depends(get_current_user)):
    data = k8s.delete_namespace(name)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data

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

class ScaleRequest(BaseModel):
    replicas: int

@router.delete("/metrics/pods/{namespace}/{pod_name}")
def delete_pod(namespace: str, pod_name: str, current_user: str = Depends(get_current_user)):
    data = k8s.delete_pod(pod_name, namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data

@router.post("/metrics/deployments/{namespace}/{deployment_name}/restart")
def restart_deployment(namespace: str, deployment_name: str, current_user: str = Depends(get_current_user)):
    data = k8s.restart_deployment(deployment_name, namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data

@router.post("/metrics/deployments/{namespace}/{deployment_name}/scale")
def scale_deployment(namespace: str, deployment_name: str, req: ScaleRequest, current_user: str = Depends(get_current_user)):
    data = k8s.scale_deployment(deployment_name, req.replicas, namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data

@router.get("/metrics/pods/{namespace}/{pod_name}/details")
def get_pod_details(namespace: str, pod_name: str, current_user: str = Depends(get_current_user)):
    data = k8s.get_pod_details(pod_name, namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data
