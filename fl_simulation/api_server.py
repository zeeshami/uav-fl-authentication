"""
api_server.py - FastAPI + WebSocket backend for the FL simulation
==================================================================
Endpoints:
  GET  /api/status              - runner status + last config
  POST /api/simulation/start    - start FL with config body
  POST /api/simulation/stop     - stop running simulation
  GET  /api/results             - full training history JSON
  GET  /api/plots               - list available plot filenames
  GET  /api/plots/{filename}    - serve plot as base64 PNG
  WS   /ws                      - real-time event stream

Run:  uvicorn api_server:app --host 0.0.0.0 --port 8765 --reload
"""

import asyncio
import base64
import json
import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from fl_runner import FLRunner
from config import RESULTS_DIR

app = FastAPI(title="UAV-FL Authentication API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global runner & event loop reference ─────────────────────────────────────
runner      = FLRunner()
_event_loop = None          # set on startup
_ws_clients: list[asyncio.Queue] = []


# ── Lifecycle ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global _event_loop
    _event_loop = asyncio.get_running_loop()

    def fl_callback(event_type: str, data: dict):
        """Called from the FL background thread — schedule coroutine on the loop."""
        msg = json.dumps({"type": event_type, **data})
        for q in list(_ws_clients):
            _event_loop.call_soon_threadsafe(q.put_nowait, msg)

    runner.set_callback(fl_callback)
    print("[API] FastAPI server ready on http://0.0.0.0:8765")


# ── Request models ────────────────────────────────────────────────────────────
class SimConfig(BaseModel):
    rounds:  int   = 30
    agg:     str   = "fedavg"
    attack:  float = 0.30
    compare: bool  = False


# ── REST endpoints ────────────────────────────────────────────────────────────
@app.get("/api/status")
def get_status():
    return {"status": runner.status, "config": runner.config}


@app.post("/api/simulation/start")
def start_simulation(cfg: SimConfig):
    ok = runner.start(
        rounds=cfg.rounds,
        agg=cfg.agg,
        attack=cfg.attack,
        compare=cfg.compare,
    )
    if not ok:
        return {"ok": False, "message": "Simulation already running"}
    return {"ok": True, "message": "Simulation started", "config": cfg.dict()}


@app.post("/api/simulation/stop")
def stop_simulation():
    runner.stop()
    return {"ok": True, "message": "Stop signal sent"}


@app.get("/api/results")
def get_results():
    path = os.path.join(RESULTS_DIR, "fl_training_history.json")
    if not os.path.exists(path):
        return {"error": "No results yet"}
    with open(path) as f:
        return json.load(f)


@app.get("/api/plots")
def list_plots():
    fig_dir = os.path.join(RESULTS_DIR, "figures")
    if not os.path.exists(fig_dir):
        return {"plots": []}
    return {"plots": sorted(os.listdir(fig_dir))}


@app.get("/api/plots/{filename}")
def get_plot(filename: str):
    path = os.path.join(RESULTS_DIR, "figures", filename)
    if not os.path.exists(path):
        return {"error": "File not found"}
    with open(path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode()
    return {"filename": filename, "data": f"data:image/png;base64,{encoded}"}


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    q: asyncio.Queue = asyncio.Queue()
    _ws_clients.append(q)
    # Send current status immediately on connect
    await ws.send_text(json.dumps({
        "type":   "connected",
        "status": runner.status,
        "config": runner.config,
    }))
    try:
        while True:
            msg = await q.get()
            await ws.send_text(msg)
    except (WebSocketDisconnect, Exception):
        _ws_clients.remove(q)
