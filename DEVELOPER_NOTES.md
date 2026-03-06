
```bash
# Example: If you are making version 3 (v3)
docker build -t ashrith2727/frontend-metrics:v3 ./frontend
docker push ashrith2727/frontend-metrics:v3

docker build -t ashrith2727/backend-metrics:v3 ./backend
docker push ashrith2727/backend-metrics:v3
```
---

## Scenario 2: You ONLY updated the Helm Chart files

If you only changed Helm files (like adding a new Kubernetes Service, or modifying ConfigMaps), you do not need to rebuild Docker images. 

### Step 2.1: Proceed directly to "Updating the Helm Chart" below. 👇

---

## 🏗️ Updating the Helm Chart (The Safe `/tmp/` Method)

Whenever `charts/values.yaml`, `charts/Chart.yaml`, or any file in `charts/templates/` changes, run these steps in order to publish the new version to GitHub Pages safely.

### 1. Bump the Chart Version
Open `charts/Chart.yaml` and increase the `version:` number (e.g., from `0.2.5` to `0.2.6`). This is **mandatory** for Helm to recognize it as a new release.

### 2. Package the Chart to /tmp
Run this exactly as written from the `Metrics` root folder (`main` branch):

```bash
git checkout main
helm dependency update ./charts
helm package ./charts
cp metrics-0.2.6.tgz /tmp/     # REPLACE 0.2.6 with your new Chart.yaml version
rm metrics-0.2.6.tgz           # Delete it from workspace so git doesn't trip up
```

### 3. Switch to gh-pages and Publish

```bash
git checkout gh-pages
cp /tmp/metrics-0.2.6.tgz .    # Pull it back from the temporary folder
helm repo index . --url https://brahmanyasudulagunta.github.io/Metrics
```

### 4. Commit to gh-pages

```bash
git add index.yaml metrics-0.2.6.tgz
git commit -m "Publish chart release 0.2.6"
git push origin gh-pages
```

### 5. Return to Main and Commit there

```bash
git checkout main
git add charts/Chart.yaml charts/values.yaml
git commit -m "Bump chart version to 0.2.6"
git push origin main
```

---


```bash
# Tell Helm to check GitHub for the new index.yaml you just pushed
helm repo update metrics 

# Upgrade the existing installation
helm upgrade --install my-metrics metrics/metrics -n metrics --reset-values --set monitoring.enabled=false --set prometheus.url="http://monitoring-kube-prometheus-prometheus.monitoring:9090"
```
*(Remove the `--set` flags above if deploying into a fresh cluster that needs Prometheus auto-installed).*
