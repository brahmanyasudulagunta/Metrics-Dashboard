from fastapi import APIRouter, HTTPException, Depends
from services.prometheus_client import PromClient
from api.auth import get_current_user

router = APIRouter()
client = PromClient()

@router.get("/metrics/query_range_raw")
def query_range_raw(
    query: str,
    current_user: str = Depends(get_current_user),
    start: int = None,
    end: int = None,
    step: str = '15s'
):
    """Execute raw PromQL and return the raw Prometheus JSON response"""
    if not query:
        raise HTTPException(status_code=400, detail="Query parameter is required")
    
    try:
        return client.query_range_result_like_prom(query, start=start, end=end, step=step)
    except Exception as e:
        logger.error(f"Explorer query error: {e}")
        return {"status": "success", "data": {"resultType": "matrix", "result": []}}
