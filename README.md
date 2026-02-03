# 📊 System & Infra Metrics Dashboard

A full-stack DevOps monitoring dashboard that collects and visualizes system metrics using Prometheus, with a modern React frontend and FastAPI backend.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **Real-time System Metrics**: CPU, Memory, Disk usage with threshold alerts
- **Network Monitoring**: TX/RX throughput visualization
- **Container Metrics**: Docker container CPU and memory via cAdvisor
- **User Authentication**: Secure JWT-based signup/login
- **Dark/Light Mode**: Toggle between themes
- **Data Export**: Export metrics as CSV or JSON
- **Time Range Selection**: View 1h, 6h, 12h, 24h, or 7 days of data

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Prometheus │
│   (React)   │     │  (FastAPI)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
     :3001              :8000               :9090
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    │                                                   │
              ┌─────────────┐                                    ┌─────────────┐
              │ Node Exporter│                                    │   cAdvisor  │
              │    :9100    │                                    │    :9000    │
              └─────────────┘                                    └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Metrics

# Start all services
docker-compose -f infra/docker-compose.yml up -d

# Access the dashboard
open http://localhost:3001
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## 📁 Project Structure

```
Metrics/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # Routes, auth, security
│   │   ├── db/             # SQLAlchemy models
│   │   └── services/       # Prometheus client
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Dashboard, Charts, Login
│   │   └── App.tsx
│   └── package.json
├── infra/                  # Infrastructure configs
│   ├── docker-compose.yml
│   ├── prometheus/         # Prometheus config & rules
│   └── grafana/           # Grafana provisioning
└── k8s/                   # Kubernetes manifests
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
PROMETHEUS_URL=http://localhost:9090
SQLALCHEMY_DATABASE_URL=sqlite:///./data/users.db
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signup` | Create new user |
| POST | `/api/login` | Authenticate user |
| GET | `/api/metrics/cpu` | CPU usage over time |
| GET | `/api/metrics/memory` | Memory usage over time |
| GET | `/api/metrics/disk` | Disk usage over time |
| GET | `/api/metrics/network_rx` | Network receive throughput |
| GET | `/api/metrics/network_tx` | Network transmit throughput |
| GET | `/api/metrics/uptime` | System uptime |
| GET | `/api/metrics/load` | Load averages |
| GET | `/api/metrics/containers` | Container list with stats |
| GET | `/api/metrics/temperature` | System temperature |

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- SQLAlchemy (SQLite)
- Prometheus API Client
- JWT Authentication (python-jose)
- Rate Limiting (slowapi)

**Frontend:**
- React 19
- Material-UI (MUI)
- Recharts
- Axios
- React Router

**Infrastructure:**
- Prometheus
- Node Exporter
- cAdvisor
- Docker Compose

## 📄 License

MIT License - feel free to use this project for learning and development.
