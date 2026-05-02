# 🚁 UAV Federated Learning — Handover Authentication Simulation

> **Course Project: Implementation & Preliminary Experimentation Phase**  
> A research-grade simulation of Federated Learning-based authentication for UAV swarm handover operations, featuring a real-time 3D React frontend and a Python FL backend.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Preliminary Results](#preliminary-results)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
  - [1. Python Backend (FL Engine)](#1-python-backend-fl-engine)
  - [2. Frontend (3D Visualization)](#2-frontend-3d-visualization)
- [Running the Standalone Simulation](#running-the-standalone-simulation)
- [Project Structure](#project-structure)
- [Research Basis](#research-basis)
- [Configuration](#configuration)

---

## Overview

This project simulates a **cooperative UAV swarm** performing secure parcel handover operations in a federated learning (FL) framework. Each UAV node trains a local authentication model on its own data and contributes model updates to a global server — without sharing raw sensor data.

**Key contributions:**
- 🔐 **Three-layer trust fusion**: Cryptographic score + AI model score + Witness consensus
- 🤖 **Byzantine-robust aggregation**: FedAvg, Krum, and Coordinate-wise Median
- 📡 **Witness Protocol**: Quorum-based validation by neighbouring UAVs
- ⚔️ **Adversarial scenarios**: Spoofing, Replay, Rogue Node, Sybil attacks simulated across training rounds
- 🎮 **Real-time 3D visualization**: Live WebSocket feed from backend to React/Three.js frontend

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  3D Scene    │  │  FL Panel    │  │  Control UI   │  │
│  │  (Three.js)  │  │  (Metrics)   │  │  (Zustand)    │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│           │               │                              │
│           └───────────────┴── WebSocket ws://localhost:8765/ws
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│              Python Backend (FastAPI + Uvicorn)           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  FL Runner   │  │  FL Server   │  │  Aggregation  │  │
│  │  (threaded)  │  │  (rounds)    │  │  FedAvg/Krum  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  UAV Nodes   │  │  Witness     │  │  Visualiser   │  │
│  │  (10 drones) │  │  Protocol    │  │  (Matplotlib) │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**UAV Roles:**
| ID | Role | Description |
|----|------|-------------|
| 0 | `sender` | Parcel-carrying drone initiating handover |
| 1 | `receiver` | Target drone accepting the parcel |
| 2–4 | `witness` | Validator drones providing quorum consensus |
| 5–9 | `relay` | Edge FL participants (some may be adversarial) |

---

## Preliminary Results

The simulation was run for **30 FL rounds** with 25% Byzantine relay nodes using **FedAvg** aggregation.

### Global Accuracy & F1 Score Convergence
![Global Accuracy and F1](fl_simulation/results/figures/1_global_accuracy_f1.png)

### Trust Layer Score Breakdown (Crypto / AI / Witness)
![Trust Layer Scores](fl_simulation/results/figures/2_trust_layer_scores.png)

### Authentication Decision Heatmap (by Round × Attack Scenario)
![Decision Heatmap](fl_simulation/results/figures/3_decision_heatmap.png)

### Witness Confidence Over Time
![Witness Confidence](fl_simulation/results/figures/4_witness_confidence.png)

### Client Accuracy Distribution per Round
![Client Accuracy Distribution](fl_simulation/results/figures/5_client_accuracy_dist.png)

### Aggregation Method Comparison (FedAvg vs Krum vs Median)

| Method | Final Accuracy | Final F1 | Final Loss | Final Precision | Final Recall |
|--------|----------------|----------|------------|-----------------|--------------|
| **FedAvg** | **0.987** | **0.9762** | **0.1686** | **1.000** | **0.9546** |
| Krum   | 0.998 | 0.9966 | 0.1399 | 1.000 | 0.9933 |
| Median | 0.998 | 0.9966 | 0.1407 | 1.000 | 0.9933 |

> Results are deterministic (`RANDOM_SEED=42`). Run `python main.py --compare` to regenerate.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 19 + Vite 8 | UI framework & build tool |
| Three.js + @react-three/fiber | 3D rendering engine |
| @react-three/drei | 3D helpers (OrbitControls, etc.) |
| Zustand | Global state management |
| Framer Motion | UI animations |

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.10+ | Core runtime |
| FastAPI + Uvicorn | REST API & WebSocket server |
| NumPy + Pandas | Data generation & processing |
| Matplotlib | Results visualization & plot generation |
| scikit-learn | Classification metrics (accuracy, F1, etc.) |

---

## Quick Start

### Prerequisites
- **Node.js** ≥ 18 and npm
- **Python** ≥ 3.10

---

### 1. Python Backend (FL Engine)

```bash
# Navigate to the backend directory
cd fl_simulation

# Create and activate a virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI WebSocket server
uvicorn api_server:app --host 0.0.0.0 --port 8765 --reload
```

> **Windows shortcut:** Double-click `fl_simulation/start_backend.bat`

The API will be available at:
- REST API: `http://localhost:8765`
- Interactive Docs: `http://localhost:8765/docs`
- WebSocket: `ws://localhost:8765/ws`

---

### 2. Frontend (3D Visualization)

Open a **new terminal** in the project root:

```bash
# Install frontend dependencies
npm install

# Start the development server
npm run dev
```

Open your browser at **http://localhost:5173** (or whichever port Vite assigns).

> The frontend connects to the backend via WebSocket. Start the backend **first**.

---

## Running the Standalone Simulation

You can run the Python FL simulation **without the frontend** to generate results and plots:

```bash
cd fl_simulation

# Default run (30 rounds, FedAvg, 25% attack)
python main.py

# Custom configuration
python main.py --rounds 20 --agg krum --attack 0.35

# Run with aggregation comparison (FedAvg vs Krum vs Median)
python main.py --compare

# Skip plot generation
python main.py --no-plots
```

**CLI Arguments:**
| Argument | Default | Description |
|----------|---------|-------------|
| `--rounds` | 30 | Number of FL training rounds |
| `--agg` | `fedavg` | Aggregation method: `fedavg`, `krum`, `median`, `fedprox` |
| `--attack` | 0.25 | Fraction of malicious relay nodes [0.0 – 1.0] |
| `--compare` | off | Enable comparative aggregation experiment |
| `--no-plots` | off | Skip Matplotlib chart generation |

Results are saved to:
- `fl_simulation/results/fl_training_history.json` — Full per-round metrics
- `fl_simulation/results/aggregation_comparison.json` — Method comparison
- `fl_simulation/results/figures/` — PNG charts (5 plots)
- `fl_simulation/logs/witness_auth_log.json` — Authentication event log

---

## Project Structure

```
uav-simulation/
├── fl_simulation/                # Python FL backend
│   ├── main.py                   # Standalone CLI entry point
│   ├── api_server.py             # FastAPI REST + WebSocket server
│   ├── fl_runner.py              # Event-driven FL runner (for API)
│   ├── fl_server.py              # Federated Learning parameter server
│   ├── uav_node.py               # UAV client node (local training)
│   ├── model.py                  # Neural network authentication model
│   ├── aggregation.py            # FedAvg / Krum / Median / FedProx
│   ├── witness_protocol.py       # Quorum-based witness authentication
│   ├── dataset_generator.py      # Synthetic UAV dataset generator
│   ├── visualise.py              # Matplotlib chart generation
│   ├── config.py                 # All simulation hyperparameters
│   ├── requirements.txt          # Python dependencies
│   ├── start_backend.bat         # Windows quick-start script
│   ├── results/
│   │   ├── fl_training_history.json
│   │   ├── aggregation_comparison.json
│   │   └── figures/              # Generated PNG charts
│   └── logs/
│       └── witness_auth_log.json
│
├── src/                          # React frontend source
│   ├── main.jsx                  # App entry point
│   ├── App.jsx                   # Root component
│   ├── store.js                  # Zustand global state
│   ├── components/
│   │   ├── 3d/                   # Three.js scene components
│   │   │   ├── SimulationScene.jsx
│   │   │   ├── Drone.jsx
│   │   │   ├── FLSwarmMode.jsx   # FL swarm visualization
│   │   │   ├── LogisticsMode.jsx # Logistics/handover mode
│   │   │   ├── HandoverMode.jsx
│   │   │   ├── CityEnvironment.jsx
│   │   │   ├── RSU.jsx
│   │   │   └── ...
│   │   └── ui/                   # React UI overlays
│   │       ├── AppOverlay.jsx
│   │       ├── FLPanel.jsx       # Real-time FL metrics panel
│   │       ├── ControlPanel.jsx
│   │       └── DataPanel.jsx
│   └── index.css
│
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

---

## Research Basis

This implementation is grounded in peer-reviewed literature:

1. **McMahan et al. (2017)** — *"Communication-Efficient Learning of Deep Networks from Decentralized Data"* — FedAvg algorithm, partial client participation
2. **Blanchard et al. (2017)** — *"Machine Learning with Adversaries: Byzantine Tolerant Gradient Descent"* — Krum aggregation for Byzantine robustness
3. **Yin et al. (2018)** — *"Byzantine-Robust Distributed Learning: Towards Optimal Statistical Rates"* — Coordinate-wise Median aggregation
4. **Gyawali & Qian (2021)** — *"Challenges and Solutions for Secure and Trustworthy Federated Learning"* — Adversarial FL threat model
5. **Ferrag et al. (2020)** — *"Deep Learning for Cyber Security Intrusion Detection"* — Feature engineering for UAV anomaly detection

---

## Configuration

All hyperparameters are centralized in `fl_simulation/config.py`:

```python
NUM_UAVS          = 10     # Total UAV nodes in the swarm
NUM_WITNESS_UAVS  = 3      # Witness/validator drones
FL_ROUNDS         = 30     # Global FL training rounds
LOCAL_EPOCHS      = 3      # Local epochs per round
LEARNING_RATE     = 1e-3
FRACTION_FIT      = 0.8    # Fraction of clients per round (FedAvg C)
ATTACK_FRACTION   = 0.25   # Fraction of malicious relay nodes
AGGREGATION_METHOD = "fedavg"

# Trust fusion weights
TRUST_WEIGHTS = {
    "crypto"  : 0.40,
    "ai_model": 0.40,
    "witness" : 0.20,
}
TRUST_THRESHOLD_APPROVE = 85.0
TRUST_THRESHOLD_REJECT  = 50.0
```

---

## License

This project is submitted as coursework. All code is original unless otherwise cited.
