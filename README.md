# 📊 Metrics Dashboard

A **DevOps monitoring dashboard** built with FastAPI, React, and Prometheus. Monitor system resources, Docker containers, and run PromQL queries from a clean dark-themed UI.

## Features

- **System Metrics** — CPU, Memory, Disk, Load Average, Uptime, Temperature
- **Container Monitoring** — Live container stats, logs, and processes
- **Network** — RX / TX throughput with time-series charts
- **PromQL Explorer** — Run raw Prometheus queries and visualize results
- **Auth** — JWT login with rate limiting

## Tech Stack

| | |
|---|---|
| **Frontend** | React 19, TypeScript, MUI 7, Recharts |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy |
| **Monitoring** | Prometheus, Node Exporter, cAdvisor |
| **Database** | PostgreSQL 16 |
| **Infra** | Docker Compose, Nginx |

## Quick Start

```bash
# Clone
git clone https://github.com/brahmanyasudulagunta/Metrics-Dashboard.git
cd Metrics-Dashboard

# Build
docker build -t backend-metrics:v1 ./backend
docker build -t frontend-metrics:v1 ./frontend

# Run
docker compose -f infra/docker-compose.yml up -d
```

**Dashboard** → http://localhost:3001  
**API Docs** → http://localhost:8000/docs  
**Prometheus** → http://localhost:9090

> Sign up at `/signup`, then log in to access the dashboard.

## Architecture

```
Frontend (3001) → Backend (8000) → Prometheus (9090)
                       ↓                  ↑
                  PostgreSQL        Node Exporter
                   (5433)            + cAdvisor
```

## Environment Variables

Set in `backend/.env`:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret key for JWT signing |
| `PROMETHEUS_URL` | Prometheus URL (default: `http://prometheus:9090`) |
| `SQLALCHEMY_DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGINS` | Allowed CORS origins |

## Stop

```bash
docker compose -f infra/docker-compose.yml down      # keep data
docker compose -f infra/docker-compose.yml down -v    # remove data
```

## License

MIT
