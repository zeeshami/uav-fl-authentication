import React, { useEffect, useRef } from 'react';
import { useV2XStore } from '../../store';

// ── Phase metadata ─────────────────────────────────────────────────────────────
const PHASE_INFO = {
  idle:           { label: 'System Idle',          color: '#94a3b8', icon: '⏸' },
  local_training: { label: 'Local Model Training', color: '#f59e0b', icon: '🧠' },
  pqc_exchange:   { label: 'PQC Key Exchange',     color: '#7c3aed', icon: '🔐' },
  aggregation:    { label: 'FL Aggregation',        color: '#22d3ee', icon: '📡' },
  consensus:      { label: 'Trust Consensus',       color: '#22c55e', icon: '✅' },
  excluded:       { label: 'Malicious Excluded',    color: '#ef4444', icon: '🚫' },
};

// ── Animated number counter ────────────────────────────────────────────────────
function AnimatedValue({ value, suffix = '', decimals = 0, color = '#e2e8f0' }) {
  const displayRef = useRef(null);
  const currentRef = useRef(value);

  useEffect(() => {
    const target  = value;
    const start   = currentRef.current;
    const dur     = 800;
    const startTs = performance.now();

    const step = (now) => {
      const t = Math.min((now - startTs) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      currentRef.current = start + (target - start) * eased;
      if (displayRef.current) {
        displayRef.current.textContent =
          currentRef.current.toFixed(decimals) + suffix;
      }
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, decimals, suffix]);

  return (
    <span ref={displayRef} style={{ color, fontFamily: 'monospace', fontWeight: 'bold' }}>
      {value.toFixed(decimals)}{suffix}
    </span>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function MetricBar({ value, max = 100, color, label, unit }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </span>
        <AnimatedValue value={value} suffix={unit} decimals={unit === '%' ? 1 : 0} color={color} />
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: '3px',
          boxShadow: `0 0 8px ${color}88`,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

// ── Slider control ─────────────────────────────────────────────────────────────
function LabeledSlider({ label, value, min, max, step, onChange, displayValue, color }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </span>
        <span style={{ fontSize: '12px', color: color ?? '#e2e8f0', fontWeight: 'bold', fontFamily: 'monospace' }}>
          {displayValue ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: color ?? '#38bdf8',
          cursor: 'pointer',
          height: '4px',
        }}
      />
    </div>
  );
}

// ── Vehicle trust chip ─────────────────────────────────────────────────────────
function VehicleChip({ vehicle }) {
  const color    = vehicle.isMalicious ? '#ef4444' : '#22c55e';
  const excluded = vehicle.excluded;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      background: excluded ? 'rgba(100,100,100,0.1)' : `${color}18`,
      border: `1px solid ${excluded ? '#374151' : color + '55'}`,
      borderRadius: '6px',
      opacity: excluded ? 0.45 : 1,
    }}>
      {/* Status dot */}
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: excluded ? '#64748b' : color,
        boxShadow: excluded ? 'none' : `0 0 5px ${color}`,
        flexShrink: 0,
      }} />
      {/* ID */}
      <span style={{ fontSize: '10px', color: excluded ? '#64748b' : '#e2e8f0', fontFamily: 'monospace', minWidth: '28px' }}>
        V{String(vehicle.id + 1).padStart(2, '0')}
      </span>
      {/* Trust bar */}
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          width: `${vehicle.trustScore}%`,
          height: '100%',
          background: excluded ? '#374151' : color,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: '9px', color: excluded ? '#4b5563' : color, fontFamily: 'monospace', minWidth: '28px', textAlign: 'right' }}>
        {excluded ? 'X' : `${vehicle.trustScore}%`}
      </span>
    </div>
  );
}

// ── Main V2X Panel ─────────────────────────────────────────────────────────────
export default function V2XPanel() {
  const {
    isRunning, setRunning,
    vehicleCount, setVehicleCount,
    attackIntensity, setAttackIntensity,
    encryptionMode, setEncryptionMode,
    showTrustScores, toggleTrustScores,
    flPhase, flRound,
    vehicles,
    modelAccuracy, latency, commOverhead,
    initV2X, reinitVehicles,
  } = useV2XStore();

  const phase   = PHASE_INFO[flPhase] ?? PHASE_INFO.idle;
  const malCount = vehicles.filter(v => v.isMalicious).length;
  const excCount = vehicles.filter(v => v.excluded).length;

  const handleVehicleCount = (n) => {
    setVehicleCount(n);
    reinitVehicles();
  };

  const handleAttack = (v) => {
    setAttackIntensity(v);
    reinitVehicles();
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ════════════════════════════ LEFT PANEL — Metrics ════════════════════ */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px',
        width: '270px',
        background: 'linear-gradient(135deg, rgba(9,18,37,0.92) 0%, rgba(14,26,50,0.92) 100%)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 40px rgba(56,189,248,0.08), 0 24px 48px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px' }}>
              V2X Federated Learning
            </div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0' }}>
              Network Intelligence
            </div>
          </div>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
          }}>🌐</div>
        </div>

        {/* FL Round badge */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>FL Round</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace' }}>
            #{flRound}
          </span>
        </div>

        {/* Phase badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: `${phase.color}18`, border: `1px solid ${phase.color}44`,
          borderRadius: '8px', padding: '8px 12px', marginBottom: '18px',
        }}>
          <span style={{ fontSize: '16px' }}>{phase.icon}</span>
          <div>
            <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '1px' }}>Current Phase</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: phase.color }}>{phase.label}</div>
          </div>
        </div>

        {/* Metrics */}
        <MetricBar value={modelAccuracy} max={100} color="#22c55e" label="Model Accuracy" unit="%" />
        <MetricBar value={Math.min(latency, 60)} max={60} color="#f59e0b" label="Latency" unit="ms" />
        <MetricBar value={Math.min(commOverhead, 120)} max={120} color="#38bdf8" label="Comm Overhead" unit="KB/s" />

        {/* Vehicle stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px', marginTop: '4px',
        }}>
          {[
            { label: 'Total', val: vehicles.length, color: '#94a3b8' },
            { label: 'Malicious', val: malCount,    color: '#ef4444' },
            { label: 'Excluded',  val: excCount,    color: '#f97316' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
              padding: '8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color, fontFamily: 'monospace' }}>{val}</div>
              <div style={{ fontSize: '9px', color: '#4b5563', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════ RIGHT PANEL — Controls ═════════════════ */}
      <div style={{
        position: 'absolute', top: '20px', right: '20px',
        width: '270px',
        background: 'linear-gradient(135deg, rgba(9,18,37,0.92) 0%, rgba(14,26,50,0.92) 100%)',
        border: '1px solid rgba(124,58,237,0.25)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 40px rgba(124,58,237,0.08), 0 24px 48px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: '10px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
          Simulation Controls
        </div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0', marginBottom: '18px' }}>
          Parameters
        </div>

        {/* Play/Pause */}
        <button
          onClick={() => {
            if (!isRunning) { initV2X(); }
            setRunning(!isRunning);
          }}
          style={{
            width: '100%', padding: '10px', marginBottom: '18px',
            background: isRunning
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none', borderRadius: '10px',
            color: '#0f172a', fontWeight: '700', fontSize: '13px',
            cursor: 'pointer', letterSpacing: '0.5px',
            boxShadow: isRunning
              ? '0 0 20px rgba(245,158,11,0.4)'
              : '0 0 20px rgba(34,197,94,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {isRunning ? '⏸  Pause Simulation' : '▶  Start Simulation'}
        </button>

        {/* Vehicle count slider */}
        <LabeledSlider
          label="Vehicle Count"
          value={vehicleCount}
          min={4} max={20} step={1}
          onChange={handleVehicleCount}
          color="#38bdf8"
        />

        {/* Attack intensity slider */}
        <LabeledSlider
          label="Attack Intensity"
          value={attackIntensity}
          min={0} max={1} step={0.05}
          onChange={handleAttack}
          displayValue={
            attackIntensity < 0.15 ? 'None' :
            attackIntensity < 0.5  ? `Low (${Math.round(attackIntensity * 100)}%)` :
                                     `High (${Math.round(attackIntensity * 100)}%)`
          }
          color="#ef4444"
        />

        {/* Encryption mode toggle */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
            Encryption Mode
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['pqc', 'classical'].map((m) => (
              <button
                key={m}
                onClick={() => setEncryptionMode(m)}
                style={{
                  flex: 1, padding: '7px 4px', fontSize: '10px', fontWeight: '700',
                  border: `1px solid ${encryptionMode === m ? (m === 'pqc' ? '#7c3aed' : '#0ea5e9') : '#374151'}`,
                  borderRadius: '8px',
                  background: encryptionMode === m
                    ? (m === 'pqc' ? 'rgba(124,58,237,0.25)' : 'rgba(14,165,233,0.2)')
                    : 'rgba(255,255,255,0.03)',
                  color: encryptionMode === m
                    ? (m === 'pqc' ? '#c4b5fd' : '#7dd3fc')
                    : '#64748b',
                  cursor: 'pointer', letterSpacing: '0.5px',
                  transition: 'all 0.2s',
                }}
              >
                {m === 'pqc' ? '🔮 Kyber/PQC' : '🔑 AES/RSA'}
              </button>
            ))}
          </div>
        </div>

        {/* Show trust scores toggle */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px',
          background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px',
        }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Show Trust Labels</span>
          <button
            onClick={toggleTrustScores}
            style={{
              width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
              background: showTrustScores ? '#22c55e' : '#374151',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: showTrustScores ? 'calc(100% - 19px)' : '3px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {/* Reinit button */}
        <button
          onClick={() => { initV2X(); }}
          style={{
            width: '100%', padding: '8px', marginTop: '10px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', color: '#fca5a5',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.22)'}
          onMouseOut={e  => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
        >
          🔄 Reset Simulation
        </button>
      </div>

      {/* ════════════════════════════ BOTTOM — Vehicle Trust List ════════════ */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        width: 'min(760px, calc(100vw - 600px))',
        background: 'linear-gradient(135deg, rgba(9,18,37,0.92) 0%, rgba(14,26,50,0.92) 100%)',
        border: '1px solid rgba(56,189,248,0.15)',
        borderRadius: '16px', padding: '16px 20px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 40px rgba(0,0,0,0.4)',
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: '10px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>
          Vehicle Trust Registry
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '6px',
          maxHeight: '110px',
          overflowY: 'auto',
        }}>
          {vehicles.map((v) => <VehicleChip key={v.id} vehicle={v} />)}
        </div>
      </div>

      {/* ════════════════════════════ Phase label (top center) ══════════════ */}
      <div style={{
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        background: `${phase.color}22`,
        border: `1px solid ${phase.color}55`,
        borderRadius: '10px', padding: '8px 20px',
        display: 'flex', alignItems: 'center', gap: '8px',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: '18px' }}>{phase.icon}</span>
        <div>
          <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {encryptionMode === 'pqc' ? 'Kyber512 + FrodoKEM' : 'AES-256 + RSA'}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: phase.color }}>
            {phase.label}
          </div>
        </div>
      </div>
    </div>
  );
}
