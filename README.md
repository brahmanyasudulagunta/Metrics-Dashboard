# Metrics Dashboard

A Kubernetes-native monitoring dashboard that gives you real-time visibility into system resources, Docker containers, and Kubernetes clusters.

## Install via Helm

### 1. Add the Repository
```bash
helm repo add metrics https://brahmanyasudulagunta.github.io/Metrics
helm repo update
```

### Option A: Install WITH Prometheus (Fresh Cluster)
If you **don't** have Prometheus installed, this command will auto-install the dashboard along with a bundled Prometheus, Node Exporter, and Kube State Metrics.

```bash
helm install metrics metrics/metrics -n metrics --create-namespace
```

### Option B: Install WITHOUT Prometheus (Existing Cluster)
If you **already have** Prometheus installed, use this command to skip the bundled Prometheus and connect the dashboard to your existing instance.

```bash
helm install metrics metrics/metrics -n metrics --create-namespace \
  --set monitoring.enabled=false \
  --set prometheus.url="http://<your-prometheus-service>.<namespace>:9090"
```

*Example (Prometheus in "monitoring" namespace):*
```bash
--set prometheus.url="http://monitoring-kube-prometheus-prometheus.monitoring:9090"
```

---

## Access the Dashboard

Once installed, port-forward the dashboard to access it locally:

```bash
kubectl port-forward svc/metrics-dashboard 3001:3001 -n metrics
```
*Open **http://localhost:3001** in your browser.*
