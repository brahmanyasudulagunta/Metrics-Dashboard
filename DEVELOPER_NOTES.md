# 🚀 Installation Steps

## 1. Local Development (Docker Compose)
Use this for rapid development without Kubernetes.
```bash
# Start the Backend and Frontend
docker compose -f infra/docker-compose.yml up -d --build
```

## 2. Kubernetes Setup (Kind)
Use this to test the full cluster management features.
```bash
# 1. Create the local cluster
kind create cluster --name gitops

# 2. Ensure context is set
kubectl config use-context kind-gitops
```

## 3. Helm Deployment
Use this to deploy the application into the cluster.
```bash
# 1. Update chart dependencies
helm dependency update ./charts

# 2. Install/Upgrade the metrics stack
helm upgrade --install metrics ./charts \
  --namespace metrics \
  --create-namespace \
  --set monitoring.enabled=true \
  --set prometheus.url="http://prometheus-server:9090" \
  --set clusterName="gitops"
```

## 4. Verification
```bash
## 5. Troubleshooting: "Connection Refused"
If the browser console shows `ERR_CONNECTION_REFUSED` to `localhost:8000`:
1.  **Rebuild**: Ensure you have pushed the latest version of the frontend image. The `API_URL` is baked into the JS at build time.
2.  **Relative Path**: Ensure `src/config.ts` has `const API_URL = '';` (this forces the browser to hit Nginx instead of the backend directly).
3.  **Port Forward**: Ensure you are accessing the dashboard on the correct port (usually `3001` or `3002`).

```bash
# Force rebuild and re-deploy
docker build -t ashrith2727/frontend-metrics:v1 ./frontend
docker push ashrith2727/frontend-metrics:v1
kubectl rollout restart deployment metrics-dashboard -n metrics
```
