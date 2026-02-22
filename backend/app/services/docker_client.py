import docker
import logging

logger = logging.getLogger(__name__)

try:
    # Use unix socket mounted from host
    client = docker.DockerClient(base_url='unix://var/run/docker.sock')
except Exception as e:
    logger.error(f"Failed to initialize Docker client: {e}")
    client = None

def get_container_logs(container_name: str, tail: int = 200) -> str:
    """Fetch the latest logs from a specific container."""
    if not client:
        return "Error: Docker client not initialized on the backend. Is docker.sock mounted?"
    try:
        container = client.containers.get(container_name)
        logs = container.logs(tail=tail, timestamps=True).decode('utf-8')
        return logs
    except docker.errors.NotFound:
        return f"Error: Container '{container_name}' not found."
    except Exception as e:
        return f"Error fetching logs: {str(e)}"

def get_container_processes(container_name: str) -> dict:
    """Run `docker top` on a specific container to get running processes."""
    if not client:
        return {"error": "Docker client not initialized on the backend."}
    try:
        container = client.containers.get(container_name)
        # top() returns a dict: {'Titles': ['UID', 'PID', ...], 'Processes': [['root', '123', ...], ...]}
        return container.top()
    except docker.errors.NotFound:
        return {"error": f"Container '{container_name}' not found."}
    except Exception as e:
        return {"error": f"Error fetching processes: {str(e)}"}
