import React from 'react';
import { useSimStore, useAuthStore } from '../../store';
import { ShieldCheck } from 'lucide-react';
import V2XPanel from './V2XPanel';
import FLPanel  from './FLPanel';

const MODES = [
  { id: 'logistics', label: 'UAV Logistics', icon: '📦', color: '#38bdf8' },
  { id: 'handover',  label: 'UAV Handover',  icon: '🔄', color: '#a78bfa' },
  { id: 'v2x',       label: 'V2X Network',   icon: '🌐', color: '#22c55e' },
  { id: 'fl',        label: 'FL Auth Sim',   icon: '🧠', color: '#f59e0b' },
];

export default function AppOverlay() {
  const {
    mode, setMode,
    isSimulationRunning, setSimulationRunning,
    stepText, parcelStatus, showTrustScore,
  } = useSimStore();
  const { attackMode } = useAuthStore();

  const isV2X = mode === 'v2x';
  const isFL  = mode === 'fl';
  const isUAV = !isV2X && !isFL; // logistics or handover

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 10,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ═══════════════ MODE SWITCHER — always on top ══════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 6,
        background: 'rgba(9,18,37,0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, padding: 5,
        backdropFilter: 'blur(14px)',
        zIndex: 100,           // always on top of everything
        pointerEvents: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {MODES.map(({ id, label, icon, color }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              onClick={() => {
                setMode(id);
                // stop UAV delivery sim when switching away
                if (id !== 'logistics' && id !== 'handover') {
                  setSimulationRunning(false);
                }
              }}
              style={{
                padding: '8px 16px',
                border: `1px solid ${active ? color : 'transparent'}`,
                borderRadius: 10,
                background: active ? `${color}22` : 'transparent',
                color: active ? color : '#64748b',
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s', letterSpacing: '0.3px',
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════ FL MODE ════════════════════════════════════════════ */}
      {isFL && <FLPanel />}

      {/* ═══════════════ V2X MODE ═══════════════════════════════════════════ */}
      {isV2X && <V2XPanel />}

      {/* ═══════════════ UAV LOGISTICS / HANDOVER ═══════════════════════════ */}
      {isUAV && (
        <>
          {/* ─── Compact launch card (replaces full-screen overlay) ─────── */}
          {!isSimulationRunning && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 340,
              background: 'linear-gradient(135deg, rgba(9,18,37,0.97), rgba(14,26,50,0.97))',
              border: '1px solid rgba(56,189,248,0.25)',
              borderRadius: 20,
              padding: 28,
              backdropFilter: 'blur(14px)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(56,189,248,0.1)',
              zIndex: 40,
              pointerEvents: 'auto',
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
                <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 20, fontWeight: 700 }}>
                  AeroLogistics Dispatch
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>
                  Secure UAV parcel delivery network
                </p>
              </div>

              {/* Route info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <div style={{
                  background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.4)',
                  padding: '12px 16px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 10, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Origin</div>
                    <div style={{ color: '#7dd3fc', fontWeight: 600, fontSize: 13 }}>Zone A: Secure Manufacturing</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ color: '#475569', fontSize: 18 }}>↓</div>
                </div>

                <div style={{
                  background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.4)',
                  padding: '12px 16px', borderRadius: 12,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <div>
                    <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Destination</div>
                    <div style={{ color: '#86efac', fontWeight: 600, fontSize: 13 }}>Zone B: Commercial District</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <button
                onClick={() => setSimulationRunning(true)}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  color: '#0f172a', border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(56,189,248,0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 28px rgba(56,189,248,0.6)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(56,189,248,0.4)'}
              >
                🚁 Launch Delivery Simulation
              </button>

              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: '#475569' }}>
                Switch modes anytime using the tab bar below
              </div>
            </div>
          )}

          {/* ─── Active UAV Simulation HUD ────────────────────────────── */}
          {isSimulationRunning && (
            <div style={{
              position: 'absolute', bottom: 90, left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex', gap: 20, alignItems: 'flex-end',
              pointerEvents: 'auto',
            }}>
              {/* Phase card */}
              <div style={{
                background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(51,65,85,0.8)',
                padding: '20px 28px', borderRadius: 16, minWidth: 380,
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>
                      Simulation Phase
                    </h3>
                    <div style={{ color: '#38bdf8', fontSize: 18, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {stepText}
                    </div>
                  </div>
                  <button
                    onClick={() => useSimStore.getState().togglePause()}
                    style={{
                      background: useSimStore.getState().isPaused ? '#22c55e' : '#f59e0b',
                      color: '#0f172a', border: 'none', borderRadius: '50%',
                      width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontWeight: 'bold', fontSize: 14,
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      padding: 0, flexShrink: 0, marginLeft: 16, marginTop: 2,
                    }}
                  >
                    {useSimStore.getState().isPaused ? '▶' : '⏸'}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.4)', padding: 12, borderRadius: 8, marginTop: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                  <div style={{ color: '#e2e8f0', fontSize: 13 }}>Parcel: {parcelStatus}</div>
                  <button
                    onClick={() => setSimulationRunning(false)}
                    style={{
                      marginLeft: 'auto', padding: '4px 10px', fontSize: 10, fontWeight: 600,
                      border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6,
                      background: 'rgba(239,68,68,0.12)', color: '#fca5a5', cursor: 'pointer',
                    }}
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Trust score panel */}
              <div style={{
                background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(34,197,94,0.3)',
                padding: '20px 28px', borderRadius: 16, minWidth: 320,
                transform: showTrustScore ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                opacity: showTrustScore ? 1 : 0,
                transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
                pointerEvents: showTrustScore ? 'auto' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <ShieldCheck color="#22c55e" size={22} />
                  <h3 style={{ margin: 0, color: '#22c55e', fontSize: 15, fontWeight: 'bold' }}>
                    Active Trust Verification
                  </h3>
                </div>
                {[
                  { label: 'Basic Cryptographic Auth',   val: attackMode === 'spoofing'            ? '12%' : '99%', color: attackMode === 'spoofing'            ? '#ef4444' : '#38bdf8' },
                  { label: 'AI Heuristics & Trajectory', val: attackMode === 'abnormal-trajectory' ? '24%' : '95%', color: attackMode === 'abnormal-trajectory' ? '#ef4444' : '#f59e0b' },
                  { label: 'Witness Node Verification',  val: attackMode === 'rogue'               ? '0%'  : '98%', color: attackMode === 'rogue'               ? '#ef4444' : '#22c55e' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ marginTop: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#fff', marginBottom: 5, fontWeight: 600 }}>
                      <span>{label}</span>
                      <span style={{ color }}>{val}</span>
                    </div>
                    <div style={{ width: '100%', height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: val, height: '100%', background: color, transition: 'width 1s ease', boxShadow: `0 0 6px ${color}88` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
