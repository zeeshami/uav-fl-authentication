import { create } from 'zustand';

// ─── FL Authentication Simulation Store ──────────────────────────────────────
const FL_API = 'http://localhost:8765';
const FL_WS  = 'ws://localhost:8765/ws';

export const useFLStore = create((set, get) => ({
  // Connection
  wsConnected:   false,
  serverOnline:  false,

  // Simulation lifecycle
  status:        'idle',   // idle | running | complete | error
  config: { rounds: 30, agg: 'fedavg', attack: 0.30, compare: false },
  setConfig: (cfg) => set(s => ({ config: { ...s.config, ...cfg } })),

  // Swarm topology (from simulation_start event)
  swarm:         [],   // [{ uav_id, role, is_malicious }]

  // Live round data
  currentRound:  0,
  totalRounds:   0,
  flPhase:       'idle',   // idle | local_training | aggregation | auth_event | complete | error
  activeClients: [],       // clients being trained this round
  roundHistory:  [],       // [{ round, global, attack_scenario, auth_event }]

  // Latest auth event
  lastAuth: null,

  // Comparison
  comparison:    null,

  // Live log
  log:           [],

  // Plots (base64)
  plots:         {},

  // ── WebSocket management ────────────────────────────────────────────────────
  _ws: null,

  connectWS: () => {
    const existing = get()._ws;
    if (existing && existing.readyState < 2) return;

    const ws = new WebSocket(FL_WS);

    ws.onopen = () => set({ wsConnected: true, serverOnline: true });
    ws.onclose = () => set({ wsConnected: false, _ws: null });
    ws.onerror = () => set({ wsConnected: false, serverOnline: false });

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      get()._handleEvent(msg);
    };

    set({ _ws: ws });
  },

  disconnectWS: () => {
    const ws = get()._ws;
    if (ws) ws.close();
    set({ wsConnected: false, _ws: null });
  },

  _handleEvent: (msg) => {
    const { type, ...data } = msg;
    const addLog = (txt, color = '#94a3b8') =>
      set(s => ({ log: [...s.log.slice(-199), { time: Date.now(), txt, color }] }));

    switch (type) {
      case 'connected':
        set({ status: data.status });
        addLog('Connected to FL server', '#22c55e');
        break;

      case 'simulation_start':
        set({
          status: 'running', flPhase: 'local_training',
          swarm: data.swarm ?? [],
          totalRounds: data.rounds,
          currentRound: 0,
          roundHistory: [],
          activeClients: [],
          lastAuth: null,
          comparison: null,
        });
        addLog(`Simulation started: ${data.rounds} rounds, agg=${data.agg}`, '#38bdf8');
        addLog(`Swarm: ${data.total_uavs} UAVs, ${data.malicious_uavs} malicious`, '#f59e0b');
        break;

      case 'round_start':
        set({ currentRound: data.round, flPhase: 'local_training', activeClients: [] });
        addLog(`Round ${data.round} — attack: ${data.attack_scenario}`, '#a78bfa');
        break;

      case 'client_update':
        set(s => ({ activeClients: [...s.activeClients.filter(c => c.uav_id !== data.uav_id), data] }));
        addLog(`  UAV-${String(data.uav_id).padStart(2,'0')} [${data.role}] acc=${data.accuracy.toFixed(3)} f1=${data.f1.toFixed(3)}${data.is_malicious ? ' [MALICIOUS]' : ''}`,
          data.is_malicious ? '#ef4444' : '#64748b');
        break;

      case 'aggregation_done':
        set({ flPhase: 'aggregation' });
        addLog(`Aggregation complete — global acc=${data.global.accuracy.toFixed(4)}`, '#22d3ee');
        break;

      case 'auth_event':
        set({ lastAuth: data, flPhase: 'auth_event' });
        const dc = data.decision === 'APPROVED' ? '#22c55e' : data.decision === 'REJECTED' ? '#ef4444' : '#f59e0b';
        addLog(`AUTH: crypto=${data.crypto_score.toFixed(1)} ai=${data.ai_score.toFixed(1)} witness=${data.witness_score.toFixed(1)} → ${data.decision}`, dc);
        break;

      case 'round_complete':
        set(s => ({
          flPhase: 'local_training',
          roundHistory: [...s.roundHistory, { round: data.round, global: data.global, attack_scenario: data.attack_scenario }],
        }));
        break;

      case 'comparison_start':
        addLog('Starting aggregation comparison experiment...', '#a855f7');
        break;

      case 'comparison_method':
        addLog(`  ${data.method.toUpperCase()} → acc=${data.metrics.accuracy.toFixed(4)} f1=${data.metrics.f1.toFixed(4)}`, '#c4b5fd');
        set(s => ({ comparison: { ...s.comparison, [data.method]: data.metrics } }));
        break;

      case 'simulation_complete':
        set({ status: 'complete', flPhase: 'complete', comparison: data.comparison });
        addLog('Simulation complete! Fetching plots...', '#22c55e');
        // Auto-fetch plots
        data.plots?.forEach(fn => get().fetchPlot(fn));
        break;

      case 'simulation_stopped':
        set({ status: 'idle', flPhase: 'idle' });
        addLog('Simulation stopped by user.', '#f59e0b');
        break;

      case 'error':
        set({ status: 'error', flPhase: 'error' });
        addLog(`ERROR: ${data.message}`, '#ef4444');
        break;

      default:
        break;
    }
  },

  // ── API actions ─────────────────────────────────────────────────────────────
  startSimulation: async () => {
    const cfg = get().config;
    set({ log: [] });
    const res = await fetch(`${FL_API}/api/simulation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    return res.json();
  },

  stopSimulation: async () => {
    await fetch(`${FL_API}/api/simulation/stop`, { method: 'POST' });
  },

  fetchPlot: async (filename) => {
    try {
      const res  = await fetch(`${FL_API}/api/plots/${filename}`);
      const json = await res.json();
      if (json.data) set(s => ({ plots: { ...s.plots, [filename]: json.data } }));
    } catch { /* ignore */ }
  },

  fetchAllPlots: async () => {
    try {
      const res   = await fetch(`${FL_API}/api/plots`);
      const json  = await res.json();
      json.plots?.forEach(fn => get().fetchPlot(fn));
    } catch { /* ignore */ }
  },

  clearLog: () => set({ log: [] }),
}));

// ─── UAV Simulation Store (unchanged) ────────────────────────────────────────
export const useSimStore = create((set) => ({
  mode: 'logistics', // 'logistics' | 'handover' | 'v2x'
  setMode: (mode) => set({ mode }),

  isSimulationRunning: false,
  toggleSimulation: () => set((state) => ({ isSimulationRunning: !state.isSimulationRunning })),
  setSimulationRunning: (run) => set({ isSimulationRunning: run }),

  isPaused: false,
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  playbackSpeed: 1,
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  // Scene 1 Phase
  logisticsPhase: 'idle',
  setLogisticsPhase: (phase) => set({ logisticsPhase: phase }),

  stepText: 'System Idle',
  setStepText: (text) => set({ stepText: text }),

  parcelStatus: 'Awaiting Dispatch',
  setParcelStatus: (status) => set({ parcelStatus: status }),

  showTrustScore: false,
  setShowTrustScore: (val) => set({ showTrustScore: val }),

  showTrajectories: true,
  toggleTrajectories: () => set((state) => ({ showTrajectories: !state.showTrajectories })),

  attackMode: 'none',
  setAttackMode: (mode) => set({ attackMode: mode }),
}));

export const useAuthStore = create((set) => ({
  cryptoScore: 0,
  aiScore: 0,
  witnessScore: 0,
  trustLevel: 'pending',

  setCryptoScore: (score) => set({ cryptoScore: score }),
  setAiScore: (score) => set({ aiScore: score }),
  setWitnessScore: (score) => set({ witnessScore: score }),

  calculateTrust: () => set((state) => {
    const totalScore = (state.cryptoScore * 0.4) + (state.aiScore * 0.4) + (state.witnessScore * 0.2);
    let level = 'pending';
    if (totalScore > 85) level = 'approved';
    else if (totalScore < 50) level = 'rejected';
    return { trustLevel: level };
  }),

  resetAuth: () => set({ cryptoScore: 0, aiScore: 0, witnessScore: 0, trustLevel: 'pending' })
}));

// ─── V2X Federated Learning + Post-Quantum Store ─────────────────────────────

const ROAD_PATHS = [
  // Lane 0 — main horizontal west→east
  { axis: 'x', z: -4, dir: 1 },
  // Lane 1 — east→west
  { axis: 'x', z: 4,  dir: -1 },
  // Lane 2 — vertical north→south
  { axis: 'z', x: -8, dir: 1 },
  // Lane 3 — vertical south→north
  { axis: 'z', x: 8,  dir: -1 },
];

function buildVehicles(count, attackIntensity) {
  return Array.from({ length: count }, (_, i) => {
    const lane = ROAD_PATHS[i % ROAD_PATHS.length];
    const isMalicious = Math.random() < attackIntensity * 0.4;
    const trustScore = isMalicious
      ? Math.floor(10 + Math.random() * 30)
      : Math.floor(70 + Math.random() * 30);

    // Spread vehicles along their lane
    const offset = (i / count) * 60 - 30;
    const position = lane.axis === 'x'
      ? [offset, 0, lane.z]
      : [lane.x, 0, offset];

    return {
      id: i,
      lane: i % ROAD_PATHS.length,
      offset,
      position,
      trustScore,
      isMalicious,
      excluded: false,
      sending: false, // currently transmitting a packet
    };
  });
}

export const useV2XStore = create((set, get) => ({
  // ── Simulation running state ──
  isRunning: false,
  setRunning: (v) => set({ isRunning: v }),

  // ── Parameters (slider-controlled) ──
  vehicleCount: 12,
  setVehicleCount: (n) => set({ vehicleCount: n }),

  attackIntensity: 0.2,
  setAttackIntensity: (v) => set({ attackIntensity: v }),

  // ── Encryption mode ──
  encryptionMode: 'pqc', // 'pqc' | 'classical'
  setEncryptionMode: (m) => set({ encryptionMode: m }),

  // ── Show trust score labels ──
  showTrustScores: true,
  toggleTrustScores: () => set((s) => ({ showTrustScores: !s.showTrustScores })),

  // ── FL Phase lifecycle ──
  // idle → local_training → pqc_exchange → aggregation → consensus → excluded → idle
  flPhase: 'idle',
  setFlPhase: (p) => set({ flPhase: p }),

  flRound: 0,

  // ── Vehicles runtime array ──
  vehicles: [],

  // ── Metrics ──
  modelAccuracy: 42.0,
  latency: 14,
  commOverhead: 32,

  // ── Active data packets in flight ──
  packets: [], // { id, vehicleId, rsuIndex, color, distorted, progress }

  // ── Init / Reset ──
  initV2X: () => {
    const { vehicleCount, attackIntensity } = get();
    set({
      vehicles: buildVehicles(vehicleCount, attackIntensity),
      flPhase: 'idle',
      flRound: 0,
      modelAccuracy: 42.0,
      latency: 14,
      commOverhead: 32,
      packets: [],
    });
  },

  reinitVehicles: () => {
    const { vehicleCount, attackIntensity } = get();
    set({ vehicles: buildVehicles(vehicleCount, attackIntensity) });
  },

  // ── Called from V2XMode useFrame every N seconds ──
  advancePhase: () => {
    const { flPhase, vehicles, modelAccuracy, vehicleCount, attackIntensity, encryptionMode, flRound } = get();
    const phases = ['idle', 'local_training', 'pqc_exchange', 'aggregation', 'consensus', 'excluded'];
    const nextIndex = (phases.indexOf(flPhase) + 1) % phases.length;
    const next = phases[nextIndex];

    let updatedVehicles = vehicles;
    let newAccuracy = modelAccuracy;
    let newPackets = [];

    if (next === 'aggregation') {
      // Spawn a packet per vehicle
      newPackets = vehicles.map((v) => ({
        id: `pkt-${flRound}-${v.id}`,
        vehicleId: v.id,
        rsuIndex: v.id % 3,
        color: v.isMalicious ? '#ef4444' : '#22c55e',
        distorted: v.isMalicious,
        progress: 0,
      }));
    }

    if (next === 'consensus') {
      // Exclude malicious vehicles
      updatedVehicles = vehicles.map((v) => ({
        ...v,
        excluded: v.isMalicious,
      }));
    }

    if (next === 'idle') {
      // New round — reset excluded, update metrics
      updatedVehicles = vehicles.map((v) => ({ ...v, excluded: false, sending: false }));
      const trustedCount = vehicles.filter((v) => !v.isMalicious).length;
      const improvement = (trustedCount / Math.max(vehicles.length, 1)) * 2.5 - attackIntensity * 1.5;
      newAccuracy = Math.min(99, Math.max(30, modelAccuracy + improvement));
    }

    // Update latency & overhead
    const pqcOverhead = encryptionMode === 'pqc' ? 1.4 : 1.0;
    const newLatency = Math.round(12 + vehicleCount * 0.4 + attackIntensity * 8);
    const newOverhead = Math.round(20 * vehicleCount * pqcOverhead * 0.05);

    set({
      flPhase: next,
      vehicles: updatedVehicles,
      packets: newPackets,
      modelAccuracy: newAccuracy,
      latency: newLatency,
      commOverhead: newOverhead,
      flRound: next === 'idle' ? flRound + 1 : flRound,
    });
  },

  // ── Tick packets progress ──
  tickPackets: (delta) => {
    set((state) => ({
      packets: state.packets
        .map((p) => ({ ...p, progress: Math.min(1, p.progress + delta * 0.4) }))
        .filter((p) => p.progress < 1),
    }));
  },
}));
