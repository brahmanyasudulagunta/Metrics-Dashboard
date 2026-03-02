from fastapi import APIRouter, HTTPException, Depends
from services.k8s_client import K8sClient
from api.auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
k8s = K8sClient()


@router.get("/k8s/namespaces")
def list_namespaces(current_user: str = Depends(get_current_user)):
    data = k8s.get_namespaces()
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"namespaces": data}


@router.get("/k8s/pods")
def list_pods(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_pods(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"pods": data}


@router.get("/k8s/deployments")
def list_deployments(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_deployments(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"deployments": data}


@router.get("/k8s/services")
def list_services(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_services(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"services": data}


@router.get("/k8s/pods/{namespace}/{pod_name}/logs")
def get_pod_logs(
    namespace: str,
    pod_name: str,
    tail: int = 200,
    current_user: str = Depends(get_current_user)
):
    logs = k8s.get_pod_logs(name=pod_name, namespace=namespace, tail_lines=tail)
    return {"logs": logs}


@router.get("/k8s/events")
def list_events(namespace: str = "all", current_user: str = Depends(get_current_user)):
    data = k8s.get_events(namespace)
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return {"events": data}
