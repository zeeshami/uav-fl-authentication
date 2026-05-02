#!/usr/bin/env bash
# start.sh — Linux/macOS quick start for the UAV-FL simulation
# Usage: ./start.sh

set -e

echo "============================================================"
echo "  UAV-FL Authentication Simulation — Quick Start"
echo "============================================================"

# ── Backend ──────────────────────────────────────────────────
echo ""
echo "[1/2] Starting Python backend (FastAPI)..."
cd fl_simulation

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt --quiet

uvicorn api_server:app --host 0.0.0.0 --port 8765 &
BACKEND_PID=$!
echo "  Backend started (PID=$BACKEND_PID) at http://localhost:8765"
cd ..

# ── Frontend ─────────────────────────────────────────────────
echo ""
echo "[2/2] Starting React frontend..."
npm install --silent
npm run dev &
FRONTEND_PID=$!
echo "  Frontend started (PID=$FRONTEND_PID)"

echo ""
echo "============================================================"
echo "  Backend  : http://localhost:8765"
echo "  API Docs : http://localhost:8765/docs"
echo "  Frontend : http://localhost:5173"
echo "============================================================"
echo "  Press Ctrl+C to stop both servers."

# Wait for Ctrl+C, then clean up
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
