from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.prometheus_client import PromClient
from services.k8s_client import K8sClient
from api.auth import get_current_user

router = APIRouter()
client = PromClient()
k8s = K8sClient()

class ApplyOptimizationReq(BaseModel):
    deployment: str
    namespace: str
    cpu_limit: str = None
    memory_limit: str = None

@router.get("/metrics/optimization")
def resource_optimization(current_user: str = Depends(get_current_user)):
    """Calculate resource over-provisioning (Waste) by comparing requests vs actual usage"""
    try:
        mem_req_query = 'sum(kube_pod_container_resource_requests{resource="memory"}) by (namespace, pod)'
        mem_req_res = client.query(mem_req_query)

        mem_usage_query = 'sum(avg_over_time(container_memory_working_set_bytes{container!="POD", container!=""}[1h])) by (namespace, pod)'
        mem_usage_res = client.query(mem_usage_query)
        
        cpu_req_query = 'sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace, pod)'
        cpu_req_res = client.query(cpu_req_query)

        cpu_usage_query = 'sum(rate(container_cpu_usage_seconds_total{container!="POD", container!=""}[1h])) by (namespace, pod)'
        cpu_usage_res = client.query(cpu_usage_query)

        requests_map = {}
        for res in mem_req_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            key = f'{metric.get("namespace", "")}/{metric.get("pod", "")}'
            if metric.get("pod"): 
                val = float(res.get("value", [0, 0])[1])
                requests_map[key] = val

        usage_map = {}
        for res in mem_usage_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            key = f'{metric.get("namespace", "")}/{metric.get("pod", "")}'
            if metric.get("pod"):
                val = float(res.get("value", [0, 0])[1])
                usage_map[key] = val

        cpu_requests_map = {}
        for res in cpu_req_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            key = f'{metric.get("namespace", "")}/{metric.get("pod", "")}'
            if metric.get("pod"): 
                val = float(res.get("value", [0, 0])[1])
                cpu_requests_map[key] = val

        cpu_usage_map = {}
        for res in cpu_usage_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            key = f'{metric.get("namespace", "")}/{metric.get("pod", "")}'
            if metric.get("pod"):
                val = float(res.get("value", [0, 0])[1])
                cpu_usage_map[key] = val

        optimizations = []
        for key, req_bytes in requests_map.items():
            if key in usage_map:
                use_bytes = usage_map[key]
                waste_bytes = max(0, req_bytes - use_bytes)
                
                req_cpu = cpu_requests_map.get(key, 0)
                use_cpu = cpu_usage_map.get(key, 0)
                waste_cpu = max(0, req_cpu - use_cpu)

                # Flag if memory waste > 10MB OR CPU waste > 0.05 cores
                if waste_bytes > 10 * 1024 * 1024 or waste_cpu > 0.05:
                    parts = key.split("/")
                    
                    # Try to extract deployment name from pod name (usually everything before the last two hyphen-separated parts)
                    pod_name = parts[1] if len(parts) > 1 else ""
                    deployment = "-".join(pod_name.split("-")[:-2]) if pod_name.count("-") >= 2 else pod_name

                    optimizations.append({
                        "namespace": parts[0],
                        "pod": pod_name,
                        "deployment": deployment,
                        "requested_mb": round(req_bytes / (1024*1024), 2),
                        "used_mb": round(use_bytes / (1024*1024), 2),
                        "waste_mb": round(waste_bytes / (1024*1024), 2),
                        "requested_cpu": round(req_cpu, 3),
                        "used_cpu": round(use_cpu, 3),
                        "waste_cpu": round(waste_cpu, 3)
                    })
        
        optimizations.sort(key=lambda x: (x["waste_mb"], x["waste_cpu"]), reverse=True)
        total_waste_mb = sum(opt["waste_mb"] for opt in optimizations)
        total_waste_cpu = sum(opt["waste_cpu"] for opt in optimizations)
        # simplistic cost calc: $10/GB and $20/Core per month
        estimated_monthly_waste = round((total_waste_mb / 1024) * 10 + (total_waste_cpu * 20), 2)
        
        return {
            "optimizations": optimizations,
            "total_waste_mb": round(total_waste_mb, 2),
            "total_waste_cpu": round(total_waste_cpu, 2),
            "estimated_monthly_waste_usd": estimated_monthly_waste
        }
    except Exception as e:
        return {"error": str(e), "optimizations": [], "total_waste_mb": 0, "total_waste_cpu": 0, "estimated_monthly_waste_usd": 0}

@router.post("/metrics/optimization/apply")
def apply_optimization(req: ApplyOptimizationReq, current_user: str = Depends(get_current_user)):
    data = k8s.patch_deployment_resources(
        name=req.deployment, 
        namespace=req.namespace, 
        cpu_limit=req.cpu_limit, 
        memory_limit=req.memory_limit
    )
    if isinstance(data, dict) and "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
    return data
