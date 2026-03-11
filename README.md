# Metrics Dashboard

A Kubernetes-native monitoring dashboard that provides real-time visibility into your cluster health, pod performance, and HTTP traffic metrics.

---

## Installation

You can install the Metrics Dashboard directly from the official Helm repository.

### 1. Add the Helm Repository

```bash
helm repo add metrics https://brahmanyasudulagunta.github.io/Metrics/
helm repo update
kubectl create namespace metrics
```

### 2. Deploy the Dashboard

Choose the scenario that fits your cluster:

#### Scenario A: You already have Prometheus installed
If you are already running Prometheus (like the `kube-prometheus-stack`) in your cluster, point the dashboard to it.

```bash
helm upgrade --install metrics metrics/metrics \
  -n metrics \
  --set monitoring.enabled=false \
  --set prometheus.url="http://prometheus-operated.monitoring:9090" # Replace with your Prometheus service URL
```

#### Scenario B: You do NOT have Prometheus installed
If you have a fresh cluster, the chart can automatically install a pre-configured Prometheus stack for you.

```bash
helm upgrade --install metrics metrics/metrics \
  -n metrics
```
*(By default, this will install the dashboard alongside a bundled `kube-prometheus-stack`)*

---


## Features
- **Overview:** Real-time CPU/Memory stats for the entire cluster.
- **Kubernetes Explorer:** Deep dive into Pods, Deployments, and Events.
- **Optimization:** Identify resource-heavy pods and scaling opportunities.
