import logging
import os
from kubernetes import client, config
from kubernetes.client.rest import ApiException

logger = logging.getLogger(__name__)

class K8sClient:
    def __init__(self):
        self.api_client = None
        self.core_api = None
        self.apps_api = None
        self.current_context = None
        self._initialize_client()

    def _initialize_client(self, context=None):
        try:
            if context:
                self.current_context = context
            
            # Explicitly load config into a configuration object
            new_config = client.Configuration()
            
            try:
                config.load_incluster_config()
                # If we are in-cluster, we usually don't need host rewriting
                self.api_client = client.ApiClient()
                logger.info("Loaded Kubernetes in-cluster config.")
            except config.ConfigException:
                self._load_local_config(new_config, context=context)
                self.api_client = client.ApiClient(configuration=new_config)
            
            self.core_api = client.CoreV1Api(self.api_client)
            self.apps_api = client.AppsV1Api(self.api_client)
            
        except Exception as e:
            logger.error(f"Initialization error: {e}")
            self.core_api = None
            self.apps_api = None


    def _load_local_config(self, configuration, context=None):
        """Load kubeconfig for local/Docker Compose development into a specific configuration object."""
        try:
            # We must load into a temporary place or handle it explicitly
            # load_kube_config unfortunately has side effects on the global default configuration sometimes
            # so we load it, then copy it.
            config.load_kube_config(context=context)
            temp_config = client.Configuration.get_default_copy()
            
            # Copy values to our target configuration
            configuration.host = temp_config.host
            configuration.api_key = temp_config.api_key
            configuration.ssl_ca_cert = temp_config.ssl_ca_cert
            configuration.cert_file = temp_config.cert_file
            configuration.key_file = temp_config.key_file
            configuration.verify_ssl = temp_config.verify_ssl

            # Determine cluster name for host rewriting
            cluster_name = "gitops" 
            active_context = context or self.current_context
            if active_context and active_context.startswith("kind-"):
                cluster_name = active_context.replace("kind-", "")

            control_plane_container = f"{cluster_name}-control-plane"
            k8s_host = os.getenv("K8S_HOST")
            
            if k8s_host:
                configuration.host = k8s_host
                configuration.verify_ssl = False
                logger.info(f"Loaded local kubeconfig (rewritten to {k8s_host}).")
            else:
                import re
                if configuration.host and ("127.0.0.1" in configuration.host or "localhost" in configuration.host):
                    configuration.host = re.sub(r'(https?://)(127\.0\.0\.1|localhost):\d+', rf'\1{control_plane_container}:6443', configuration.host)
                    configuration.verify_ssl = False
                logger.info(f"Loaded local kubeconfig (auto-rewritten to {control_plane_container}:6443).")
        except Exception as e:
            logger.error(f"Failed to load Kubernetes config: {e}")

    def is_connected(self):
        return self.core_api is not None

    def get_clusters(self):
        try:
            import subprocess
            # Get list of kind clusters as a reliable source
            kind_clusters = []
            try:
                kind_output = subprocess.check_output(["kind", "get", "clusters"], text=True).strip()
                if kind_output:
                    kind_clusters = kind_output.split('\n')
            except:
                pass

            # Get list of contexts from kubeconfig
            contexts = []
            active_context_name = ""
            try:
                contexts_list, active_context = config.list_kube_config_contexts()
                contexts = [c['name'] for c in contexts_list]
                active_context_name = active_context['name'] if active_context else ""
            except:
                # Fallback to kubectl if python client fails
                try:
                    active_context_name = subprocess.check_output(["kubectl", "config", "current-context"], text=True).strip()
                    contexts = [active_context_name]
                except:
                    pass

            # Deduplicate: If we have 'kind-foo' context and 'foo' kind cluster, treat them as the same
            seen_clusters = set()
            result = []
            
            logger.info(f"Listing clusters. Host Active: {active_context_name}, Contexts: {contexts}")
            
            # Use host active context as source of truth if we haven't overridden it in session
            current_effective = self.current_context or active_context_name

            # 1. Process all contexts from kubeconfig first
            for name in contexts:
                # Normalize base name for deduplication
                base_name = name.replace("kind-", "")
                if base_name in seen_clusters:
                    continue
                seen_clusters.add(base_name)
                
                is_active = (name == active_context_name)
                is_kind = name.startswith('kind-') or base_name in kind_clusters
                
                result.append({
                    "id": name,
                    "name": name,
                    "status": "Active" if is_active else "Available",
                    "provider": "Kind" if is_kind else "Kubernetes"
                })

            # 2. Add Kind clusters that don't have a context matching their base name
            for name in kind_clusters:
                base_name = name.replace("kind-", "")
                if base_name in seen_clusters:
                    continue
                seen_clusters.add(base_name)
                
                # If we add it from Kind list and there's no context yet, use the canonical kind- name
                full_name = f"kind-{name}"
                result.append({
                    "id": full_name,
                    "name": full_name,
                    "status": "Available",
                    "provider": "Kind"
                })
            
            if not result:
                cluster_name = os.getenv("CLUSTER_NAME", "in-cluster")
                return [{"id": "in-cluster", "name": cluster_name, "status": "Active", "provider": "Kubernetes"}]
            
            # Sort by status (Active first) then by name
            result.sort(key=lambda x: (x['status'] != 'Active', x['name']))
            
            logger.info(f"Generated cluster list: {[c['name'] for c in result]}")
            return result
        except Exception as e:
            logger.error(f"Error listing clusters: {e}")
            return [{"id": "kind-gitops", "name": "kind-gitops", "status": "Active", "provider": "Kind"}]


    def create_namespace(self, name):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            ns = client.V1Namespace(metadata=client.V1ObjectMeta(name=name))
            self.core_api.create_namespace(body=ns)
            return {"success": True, "message": f"Namespace '{name}' created."}
        except Exception as e:
            return {"error": str(e)}

    def get_nodes(self):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            nodes = self.core_api.list_node()
            result = []
            for node in nodes.items:
                status = "Unknown"
                for condition in node.status.conditions:
                    if condition.type == "Ready":
                        status = "Ready" if condition.status == "True" else "NotReady"
                        break
                
                roles = [k.replace('node-role.kubernetes.io/', '') for k in node.metadata.labels.keys() if k.startswith('node-role.kubernetes.io/')]
                if not roles: roles = ["worker"]

                ip_address = ""
                for addr in node.status.addresses:
                    if addr.type == "InternalIP":
                        ip_address = addr.address
                        break

                result.append({
                    "name": node.metadata.name,
                    "status": status,
                    "roles": roles,
                    "ip": ip_address,
                    "os": node.status.node_info.os_image,
                    "kubelet_version": node.status.node_info.kubelet_version,
                    "age": node.metadata.creation_timestamp.isoformat() if node.metadata.creation_timestamp else None
                })
            return result
        except ApiException as e:
            return {"error": str(e)}

    def get_namespaces(self):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            ns_list = self.core_api.list_namespace(_request_timeout=5)
            return [{"name": ns.metadata.name, "status": ns.status.phase} for ns in ns_list.items]
        except ApiException as e:
            return {"error": str(e)}

    def create_namespace(self, name):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            ns = client.V1Namespace(metadata=client.V1ObjectMeta(name=name))
            self.core_api.create_namespace(body=ns, _request_timeout=5)
            return {"success": True, "message": f"Namespace '{name}' created."}
        except ApiException as e:
            return {"error": str(e.reason)}

    def delete_namespace(self, name):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            self.core_api.delete_namespace(name=name, _request_timeout=5)
            return {"success": True, "message": f"Namespace '{name}' deletion initiated."}
        except ApiException as e:
            return {"error": str(e.reason)}

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
            from datetime import datetime
            if namespace == "all":
                events = self.core_api.list_event_for_all_namespaces()
            else:
                events = self.core_api.list_namespaced_event(namespace)
                
            result = []
            for e in events.items:
                if e.involved_object.kind == "Pod":
                    result.append({
                        "type": e.type,
                        "reason": e.reason,
                        "message": e.message,
                        "pod": e.involved_object.name,
                        "time": e.last_timestamp.isoformat() if e.last_timestamp else None
                    })
            result.sort(key=lambda x: x["time"] or "", reverse=True)
            return result[:100]
        except ApiException as e:
            return {"error": str(e)}

    def delete_pod(self, name, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            self.core_api.delete_namespaced_pod(name=name, namespace=namespace)
            return {"success": True, "message": f"Pod {name} deleted"}
        except ApiException as e:
            return {"error": str(e)}

    def restart_deployment(self, name, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc).isoformat()
            body = {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {
                                "kubectl.kubernetes.io/restartedAt": str(now)
                            }
                        }
                    }
                }
            }
            self.apps_api.patch_namespaced_deployment(name=name, namespace=namespace, body=body)
            return {"success": True, "message": f"Deployment {name} restarted"}
        except ApiException as e:
            return {"error": str(e)}

    def scale_deployment(self, name, replicas, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            body = {"spec": {"replicas": replicas}}
            self.apps_api.patch_namespaced_deployment_scale(name=name, namespace=namespace, body=body)
            return {"success": True, "message": f"Deployment {name} scaled to {replicas}"}
        except ApiException as e:
            return {"error": str(e)}

    def get_pod_details(self, name, namespace="default"):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            pod = self.core_api.read_namespaced_pod(name=name, namespace=namespace)
            
            containers = []
            for c in pod.spec.containers:
                # Find corresponding status
                status = None
                if pod.status.container_statuses:
                    for cs in pod.status.container_statuses:
                        if cs.name == c.name:
                            status = cs
                            break

                state = "Unknown"
                if status and status.state:
                    if status.state.running: state = "Running"
                    elif status.state.waiting: state = f"Waiting ({status.state.waiting.reason})"
                    elif status.state.terminated: state = f"Terminated ({status.state.terminated.reason})"
                
                req_cpu, req_mem, lim_cpu, lim_mem = "", "", "", ""
                if c.resources:
                    if c.resources.requests:
                        req_cpu = c.resources.requests.get('cpu', '')
                        req_mem = c.resources.requests.get('memory', '')
                    if c.resources.limits:
                        lim_cpu = c.resources.limits.get('cpu', '')
                        lim_mem = c.resources.limits.get('memory', '')

                containers.append({
                    "name": c.name,
                    "image": c.image,
                    "state": state,
                    "restarts": status.restart_count if status else 0,
                    "ready": status.ready if status else False,
                    "requests": {"cpu": req_cpu, "memory": req_mem},
                    "limits": {"cpu": lim_cpu, "memory": lim_mem}
                })
                
            return {
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "status": pod.status.phase,
                "node": pod.spec.node_name,
                "ip": pod.status.pod_ip,
                "host_ip": pod.status.host_ip,
                "start_time": pod.status.start_time.isoformat() if pod.status.start_time else None,
                "labels": pod.metadata.labels or {},
                "annotations": pod.metadata.annotations or {},
                "containers": containers
            }
        except ApiException as e:
            return {"error": str(e)}

    def patch_deployment_resources(self, name, namespace="default", cpu_limit=None, memory_limit=None):
        if not self.is_connected(): return {"error": "Native K8s client not configured."}
        try:
            resources = {"requests": {}, "limits": {}}
            if cpu_limit:
                resources["requests"]["cpu"] = cpu_limit
                resources["limits"]["cpu"] = cpu_limit
            if memory_limit:
                resources["requests"]["memory"] = memory_limit
                resources["limits"]["memory"] = memory_limit
                
            if not resources["requests"]:
                return {"error": "No resources specified"}

            dep = self.apps_api.read_namespaced_deployment(name=name, namespace=namespace)
            if not dep.spec.template.spec.containers:
                return {"error": "No containers found in deployment"}
                
            containers = []
            for c in dep.spec.template.spec.containers:
                # Patch all containers with the same resources for simplicity, or just the first.
                containers.append({
                    "name": c.name,
                    "resources": resources
                })
                
            body = {
                "spec": {
                    "template": {
                        "spec": {
                            "containers": containers
                        }
                    }
                }
            }
            self.apps_api.patch_namespaced_deployment(name=name, namespace=namespace, body=body)
            return {"success": True, "message": f"Deployment {name} resources updated"}
        except ApiException as e:
            return {"error": str(e)}
