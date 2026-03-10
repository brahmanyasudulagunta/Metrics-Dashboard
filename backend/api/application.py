import logging
from fastapi import APIRouter, Depends
from services.prometheus_client import PromClient
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()
client = PromClient()

@router.get("/metrics/apm/status")
def get_apm_status(current_user: str = Depends(get_current_user)):
    """Check if Envoy Gateway metrics are available in Prometheus"""
    try:
        res = client.query('envoy_http_downstream_rq_total')
        has_data = len(res.get("data", {}).get("result", [])) > 0
        return {"available": has_data, "provider": "envoy"}
    except Exception:
        return {"available": False, "provider": "envoy"}

@router.get("/metrics/apm/summary")
def get_apm_summary(current_user: str = Depends(get_current_user)):
    """Get high-level HTTP metrics (Total RPS, Global 5xx Rate, Global P95 Latency) from Envoy Gateway"""
    try:
        # Total Requests Per Second (RPS)
        rps_query = 'sum(irate(envoy_http_downstream_rq_total[2m]))'
        rps_res = client.query(rps_query)
        rps_results = rps_res.get("data", {}).get("result", [])
        rps = float(rps_results[0]["value"][1]) if rps_results else 0.0

        # Global 5xx Error Rate (%)
        error_query = 'sum(irate(envoy_http_downstream_rq_xx{envoy_response_code_class="5"}[2m])) / sum(irate(envoy_http_downstream_rq_total[2m])) * 100'
        err_res = client.query(error_query)
        err_results = err_res.get("data", {}).get("result", [])
        err_rate = float(err_results[0]["value"][1]) if err_results else 0.0
        if str(err_rate) == 'nan':
            err_rate = 0.0

        # Global P95 Latency (Envoy reports in ms natively)
        lat_query = 'histogram_quantile(0.95, sum(irate(envoy_http_downstream_rq_time_bucket[2m])) by (le))'
        lat_res = client.query(lat_query)
        lat_results = lat_res.get("data", {}).get("result", [])
        latency_ms = float(lat_results[0]["value"][1]) if lat_results else 0.0
        if str(latency_ms) == 'nan':
            latency_ms = 0.0

        return {
            "rps": round(rps, 2),
            "error_rate": round(err_rate, 2),
            "p95_latency_ms": round(latency_ms, 2)
        }
    except Exception as e:
        return {"rps": 0, "error_rate": 0, "p95_latency_ms": 0, "error": str(e)}

@router.get("/metrics/apm/routes")
def get_apm_routes(current_user: str = Depends(get_current_user)):
    """Get RED metrics broken down by Envoy Gateway route"""
    try:
        # 1. RPS per route
        rps_q = 'sum(irate(envoy_http_downstream_rq_total[2m])) by (envoy_http_conn_manager_prefix)'
        rps_res = client.query(rps_q)

        # 2. 5xx Errors per route
        err_q = 'sum(irate(envoy_http_downstream_rq_xx{envoy_response_code_class="5"}[2m])) by (envoy_http_conn_manager_prefix)'
        err_res = client.query(err_q)

        # 3. P95 Latency per route (Envoy reports in ms)
        lat_q = 'histogram_quantile(0.95, sum(irate(envoy_http_downstream_rq_time_bucket[2m])) by (le, envoy_http_conn_manager_prefix))'
        lat_res = client.query(lat_q)

        routes_data = {}

        # Parse RPS
        for res in rps_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            gateway_route = metric.get("envoy_http_conn_manager_prefix", "unknown")
            key = gateway_route
            val = float(res.get("value", [0, 0])[1])
            routes_data[key] = {
                "gateway": gateway_route,
                "path": gateway_route,
                "rps": round(val, 2),
                "errors": 0.0,
                "error_rate": 0.0,
                "p95_ms": 0.0
            }

        # Parse Errors
        for res in err_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            key = metric.get("envoy_http_conn_manager_prefix", "unknown")
            val = float(res.get("value", [0, 0])[1])
            if key in routes_data:
                routes_data[key]["errors"] = round(val, 2)
                r = routes_data[key]["rps"]
                if r > 0:
                    routes_data[key]["error_rate"] = round((val / r) * 100, 2)

        # Parse Latency
        for res in lat_res.get("data", {}).get("result", []):
            metric = res.get("metric", {})
            key = metric.get("envoy_http_conn_manager_prefix", "unknown")
            val = float(res.get("value", [0, 0])[1])
            if str(val) != 'nan' and key in routes_data:
                routes_data[key]["p95_ms"] = round(val, 2)

        final_routes = list(routes_data.values())
        # Sort by RPS descending
        final_routes.sort(key=lambda x: x["rps"], reverse=True)

        return {"routes": final_routes}
    except Exception as e:
        return {"routes": [], "error": str(e)}
