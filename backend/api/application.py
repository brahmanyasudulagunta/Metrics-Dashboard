import logging
from fastapi import APIRouter, Depends
from services.prometheus_client import PromClient
from services.k8s_client import K8sClient
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()
prom = PromClient()
k8s = K8sClient()

# Envoy internal connection managers to exclude from user-facing metrics.
INTERNAL_FILTER = 'envoy_http_conn_manager_prefix!~"admin|eg-ready-http|eg-stats-http|prometheus|stats"'


@router.get("/metrics/apm/status")
def get_apm_status(current_user: str = Depends(get_current_user)):
    """Check if any application metrics (Envoy or cAdvisor) are available"""
    try:
        # Check for cAdvisor metrics (Universal)
        cadvisor_res = prom.query('count(container_network_receive_bytes_total)')
        has_cadvisor = len(cadvisor_res.get("data", {}).get("result", [])) > 0
        
        # Check for Envoy metrics (Premium)
        envoy_res = prom.query(f'envoy_http_downstream_rq_total{{{INTERNAL_FILTER}}}')
        has_envoy = len(envoy_res.get("data", {}).get("result", [])) > 0
        
        return {
            "available": has_cadvisor or has_envoy,
            "providers": {
                "cadvisor": has_cadvisor,
                "envoy": has_envoy
            }
        }
    except Exception:
        return {"available": False, "providers": {"cadvisor": False, "envoy": False}}


@router.get("/metrics/apm/summary")
def get_apm_summary(current_user: str = Depends(get_current_user)):
    """Get high-level summary of all cluster applications"""
    try:
        # 1. Total RPS (if Envoy is present)
        rps_query = f'sum(irate(envoy_http_downstream_rq_total{{{INTERNAL_FILTER}}}[2m]))'
        rps_res = prom.query(rps_query)
        rps_results = rps_res.get("data", {}).get("result", [])
        rps = float(rps_results[0]["value"][1]) if rps_results else 0.0

        # 2. Total Network Throughput (Universal) - Receive + Transmit
        tp_query = 'sum(irate(container_network_receive_bytes_total[2m]) + irate(container_network_transmit_bytes_total[2m]))'
        tp_res = prom.query(tp_query)
        tp_results = tp_res.get("data", {}).get("result", [])
        total_throughput_bps = float(tp_results[0]["value"][1]) if tp_results else 0.0

        # 3. Global 5xx Error Rate (%) — Envoy only
        error_query = (
            f'sum(irate(envoy_http_downstream_rq_xx{{envoy_response_code_class="5",{INTERNAL_FILTER}}}[2m]))'
            f' / sum(irate(envoy_http_downstream_rq_total{{{INTERNAL_FILTER}}}[2m])) * 100'
        )
        err_res = prom.query(error_query)
        err_results = err_res.get("data", {}).get("result", [])
        err_rate = float(err_results[0]["value"][1]) if err_results else 0.0
        if str(err_rate) == 'nan': err_rate = 0.0

        return {
            "rps": round(rps, 2),
            "throughput_kbps": round(total_throughput_bps / 1024, 2),
            "error_rate": round(err_rate, 2),
            "apps_monitored": len(k8s.get_deployments("all"))
        }
    except Exception as e:
        logger.error(f"Error in APM summary: {e}")
        return {"rps": 0, "throughput_kbps": 0, "error_rate": 0, "apps_monitored": 0}


@router.get("/metrics/apm/routes")
def get_apm_routes(current_user: str = Depends(get_current_user)):
    """Auto-discover all cluster applications and merge them with traffic data (cAdvisor + Envoy)"""
    try:
        # 1. Get all Deployments (Discovery)
        deployments = k8s.get_deployments("all")
        
        # 2. Get Throughput per Pod from cAdvisor (Universal)
        # We sum all interfaces for each pod
        tp_q = 'sum by (pod, namespace) (irate(container_network_receive_bytes_total[2m]) + irate(container_network_transmit_bytes_total[2m]))'
        tp_res = prom.query(tp_q)
        
        # 3. Get Envoy RED metrics (Premium)
        envoy_rps_q = f'sum by (envoy_http_conn_manager_prefix) (irate(envoy_http_downstream_rq_total{{{INTERNAL_FILTER}}}[2m]))'
        envoy_err_q = f'sum by (envoy_http_conn_manager_prefix) (irate(envoy_http_downstream_rq_xx{{envoy_response_code_class="5",{INTERNAL_FILTER}}}[2m]))'
        e_rps_res = prom.query(envoy_rps_q)
        e_err_res = prom.query(envoy_err_q)

        # 4. Process Throughput Data
        throughput_map = {}
        for res in tp_res.get("data", {}).get("result", []):
            pod = res["metric"].get("pod")
            ns = res["metric"].get("namespace")
            val = float(res["value"][1])
            # Aggregate pods by their "App Name" (we assume deployment name prefix)
            # Find the deployment this pod belongs to. For now, we'll map by namespace and fuzzy prefix
            key = f"{ns}/{pod.split('-')[0]}" # Very basic heuristic
            throughput_map[key] = throughput_map.get(key, 0) + val

        # 5. Process Envoy Data
        envoy_map = {}
        for res in e_rps_res.get("data", {}).get("result", []):
            name = res["metric"].get("envoy_http_conn_manager_prefix")
            envoy_map[name] = {"rps": float(res["value"][1]), "errors": 0}
        for res in e_err_res.get("data", {}).get("result", []):
            name = res["metric"].get("envoy_http_conn_manager_prefix")
            if name in envoy_map:
                envoy_map[name]["errors"] = float(res["value"][1])

        # 6. Merge Deployment Discovery with Metrics
        final_list = []
        for d in deployments:
            name = d["name"]
            ns = d["namespace"]
            key = f"{ns}/{name}"
            
            # Simple heuristic: Does an Envoy listener match the deployment name?
            envoy_data = envoy_map.get(name) or envoy_map.get(f"{ns}-{name}")
            
            # Get throughput (summed from pods matching the deployment prefix)
            # In a real app, we'd use ownerReferences, but this works for most K8s setups
            tp = throughput_map.get(key, 0.0)
            
            final_list.append({
                "name": name,
                "namespace": ns,
                "status": d["ready"],
                "throughput_kbps": round(tp / 1024, 2),
                "rps": round(envoy_data["rps"], 2) if envoy_data else None,
                "error_rate": round((envoy_data["errors"] / envoy_data["rps"] * 100), 1) if envoy_data and envoy_data["rps"] > 0 else 0.0,
                "has_premium": envoy_data is not None
            })

        # Sort by throughput (active apps first)
        final_list.sort(key=lambda x: x["throughput_kbps"], reverse=True)
        return {"routes": final_list}

    except Exception as e:
        logger.error(f"Error auto-discovering routes: {e}")
        return {"routes": [], "error": str(e)}
