# Metrics Dashboard

A Kubernetes-native monitoring dashboard that provides real-time visibility into your cluster health, pod performance, and HTTP traffic metrics.

---

## Quick Start (Local Installation)

If you are developing locally (e.g., using Kind or Minikube), follow these steps to get the full experience.

### 1. Prerequisites
Ensure you have the **Gateway API CRDs** and **Envoy Gateway** installed. This is required for the App Health tab.

```bash
# 1. Install official Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml

# 2. Install Envoy Gateway
helm install eg oci://docker.io/envoyproxy/gateway-helm -n envoy-gateway-system --create-namespace
```

### 2. Install the Dashboard
We recommend starting fresh in a dedicated namespace.

```bash
# 1. Create the namespace
kubectl create namespace metrics

# 2. Update local dependencies
helm dependency update ./charts

# 3. Install the chart (pointing to your existing Prometheus)
helm upgrade --install metrics ./charts \
  -n metrics \
  --set monitoring.enabled=false \
  --set monitoring.releaseName=monitoring \
  --set prometheus.url="http://monitoring-kube-prometheus-prometheus.monitoring:9090" \
  --set gateway.enabled=true
```

---

## How to see data in "App Health"

The App Health tab shows **RED Metrics** (Rate, Errors, Duration). In a local cluster, data only appears once you send traffic through the Envoy Proxy.

### 1. Port-Forward the Envoy Proxy
Find the Envoy service in the `envoy-gateway-system` namespace and map it to `8080`.

```bash
# Find the service name
kubectl get svc -n envoy-gateway-system

# Port-forward the one starting with 'envoy-metrics-...'
kubectl port-forward svc/<service-name> -n envoy-gateway-system 8080:80
```

### 2. Generate Traffic
Open **[http://localhost:8080](http://localhost:8080)** in your browser and refresh several times. This sends requests *through* Envoy.

### 3. Open the Dashboard
In a separate terminal, port-forward the dashboard itself:
```bash
kubectl port-forward svc/metrics-dashboard 3001:3001 -n metrics
```
*Open **[http://localhost:3001](http://localhost:3001)**. Click the **App Health** tab. Wait ~30 seconds for Prometheus to update, and the charts will light up!*

---

## Features
- **Overview:** Real-time CPU/Memory stats for the entire cluster.
- **App Health:** Live RED metrics (Traffic Rate, 5xx Errors, P95 Latency) via Envoy.
- **Kubernetes Explorer:** Deep dive into Pods, Deployments, and Events.
- **Optimization:** Identify resource-heavy pods and scaling opportunities.
