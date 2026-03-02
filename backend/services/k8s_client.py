import logging
from kubernetes import client, config
from kubernetes.client.rest import ApiException

logger = logging.getLogger(__name__)

class K8sClient:
    def __init__(self):
        self.api = None
        self.core_api = None
        self.apps_api = None
        self._initialize_client()

    def _initialize_client(self):
        try:
            # Try in-cluster config first (if running inside a pod)
            config.load_incluster_config()
            logger.info("Loaded Kubernetes in-cluster config.")
        except config.ConfigException:
            try:
                # Fallback to local kubeconfig
                config.load_kube_config()
                
                # Rewrite localhost to host.docker.internal for docker access
                c = client.Configuration.get_default_copy()
                if c.host and ("127.0.0.1" in c.host or "localhost" in c.host):
                    c.host = c.host.replace("127.0.0.1", "host.docker.internal").replace("localhost", "host.docker.internal")
                    c.verify_ssl = False
                    client.Configuration.set_default(c)
                    
                logger.info("Loaded local kubeconfig (rewritten for docker).")
            except Exception as e:
                logger.error(f"Failed to load Kubernetes config: {e}")
                return

        self.core_api = client.CoreV1Api()
        self.apps_api = client.AppsV1Api()

    def is_connected(self):
        return self.core_api is not None

    def get_namespaces(self):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            ns_list = self.core_api.list_namespace()
            return [{"name": ns.metadata.name, "status": ns.status.phase} for ns in ns_list.items]
        except ApiException as e:
            return {"error": str(e)}

    def get_pods(self, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            if namespace == "all":
                pods = self.core_api.list_pod_for_all_namespaces()
            else:
                pods = self.core_api.list_namespaced_pod(namespace)
                
            result = []
            for pod in pods.items:
                restarts = sum([c.restart_count for c in pod.status.container_statuses]) if pod.status.container_statuses else 0
                result.append({
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "status": pod.status.phase,
                    "restarts": restarts,
                    "age": pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None,
                    "node": pod.spec.node_name,
                    "ip": pod.status.pod_ip
                })
            return result
        except ApiException as e:
            return {"error": str(e)}

    def get_deployments(self, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            if namespace == "all":
                deps = self.apps_api.list_deployment_for_all_namespaces()
            else:
                deps = self.apps_api.list_namespaced_deployment(namespace)
                
            result = []
            for d in deps.items:
                ready = d.status.ready_replicas or 0
                total = d.spec.replicas or 0
                result.append({
                    "name": d.metadata.name,
                    "namespace": d.metadata.namespace,
                    "ready": f"{ready}/{total}",
                    "age": d.metadata.creation_timestamp.isoformat() if d.metadata.creation_timestamp else None
                })
            return result
        except ApiException as e:
            return {"error": str(e)}

    def get_services(self, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            if namespace == "all":
                svcs = self.core_api.list_service_for_all_namespaces()
            else:
                svcs = self.core_api.list_namespaced_service(namespace)
                
            result = []
            for s in svcs.items:
                ports = [f"{p.port}:{p.target_port}/{p.protocol}" for p in s.spec.ports] if s.spec.ports else []
                result.append({
                    "name": s.metadata.name,
                    "namespace": s.metadata.namespace,
                    "type": s.spec.type,
                    "cluster_ip": s.spec.cluster_ip,
                    "ports": ", ".join(ports)
                })
            return result
        except ApiException as e:
            return {"error": str(e)}

    def get_pod_logs(self, name, namespace="default", tail_lines=200):
        if not self.is_connected(): return "Native K8s client not configured."
        try:
            logs = self.core_api.read_namespaced_pod_log(
                name=name, namespace=namespace, tail_lines=tail_lines
            )
            return logs
        except ApiException as e:
            return f"Error fetching logs: {str(e)}"

    def get_events(self, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            if namespace == "all":
                events = self.core_api.list_event_for_all_namespaces()
            else:
                events = self.core_api.list_namespaced_event(namespace)
                
            # Filter for recent events involving pods
            result = []
            for e in events.items:
                if e.involved_object.kind == "Pod":
                    result.append({
                        "type": e.type, # Normal or Warning
                        "reason": e.reason,
                        "message": e.message,
                        "pod": e.involved_object.name,
                        "time": e.last_timestamp.isoformat() if e.last_timestamp else None
                    })
            # sort by time descending
            result.sort(key=lambda x: x["time"] or "", reverse=True)
            return result[:50] # return top 50
        except ApiException as e:
            return {"error": str(e)}
