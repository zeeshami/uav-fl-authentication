import React, { useEffect, useState } from 'react';
import { useFLStore } from '../../store';

// ── Helpers ──────────────────────────────────────────────────────────────────
const PHASE_META = {
  idle:           { label: 'System Idle',          color: '#64748b', icon: '⏸' },
  local_training: { label: 'Local Model Training', color: '#f59e0b', icon: '🧠' },
  aggregation:    { label: 'FL Aggregation',        color: '#22d3ee', icon: '📡' },
  auth_event:     { label: 'Witness Auth Event',   color: '#22c55e', icon: '🔐' },
  complete:       { label: 'Simulation Complete',  color: '#a855f7', icon: '✅' },
  error:          { label: 'Error',                 color: '#ef4444', icon: '❌' },
};

const ROLE_COLOR  = { sender:'#3b82f6', receiver:'#eab308', witness:'#ef4444', relay:'#64748b' };
const DECISION_COLOR = { APPROVED:'#22c55e', REJECTED:'#ef4444', ESCALATED:'#f59e0b' };

function Bar({ value, max = 100, color }) {
  const pct = Math.min(100, ((value ?? 0) / max) * 100);
  return (
    <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${color}88,${color})`,
        boxShadow: `0 0 6px ${color}88`, borderRadius: 3, transition: 'width 0.7s ease' }} />
    </div>
  );
}

function MetricCard({ label, value, color, suffix = '' }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
      <div style={{ fontSize:11, color:'#64748b', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.7px' }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color, fontFamily:'monospace' }}>
        {typeof value === 'number' ? value.toFixed(3) : value}{suffix}
      </div>
    </div>
  );
}

// ── Left Panel: Metrics + Auth ────────────────────────────────────────────────
function LeftPanel() {
  const { flPhase, currentRound, totalRounds, roundHistory, lastAuth, wsConnected, status } = useFLStore();
  const phase  = PHASE_META[flPhase] ?? PHASE_META.idle;
  const latest = roundHistory[roundHistory.length - 1];
  const gm     = latest?.global;

  const progressPct = totalRounds > 0 ? (currentRound / totalRounds) * 100 : 0;

  return (
    <div style={{
      position:'absolute', top:20, left:20, width:280,
      background:'linear-gradient(135deg,rgba(9,18,37,0.95),rgba(14,26,50,0.95))',
      border:'1px solid rgba(56,189,248,0.2)', borderRadius:16, padding:20,
      backdropFilter:'blur(14px)', boxShadow:'0 0 40px rgba(56,189,248,0.07),0 24px 48px rgba(0,0,0,0.6)',
      pointerEvents:'auto',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:10, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:2 }}>
            UAV-FL Authentication
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'#e2e8f0' }}>Witness Protocol</div>
        </div>
        <div style={{
          width:10, height:10, borderRadius:'50%', marginTop:6,
          background: wsConnected ? '#22c55e' : '#ef4444',
          boxShadow: `0 0 8px ${wsConnected ? '#22c55e' : '#ef4444'}`,
        }} title={wsConnected ? 'Connected' : 'Disconnected'} />
      </div>

      {/* Phase badge */}
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, marginBottom:14,
        background:`${phase.color}18`, border:`1px solid ${phase.color}44`,
      }}>
        <span style={{ fontSize:16 }}>{phase.icon}</span>
        <div>
          <div style={{ fontSize:9, color:'#64748b', marginBottom:1 }}>Current Phase</div>
          <div style={{ fontSize:12, fontWeight:600, color:phase.color }}>{phase.label}</div>
        </div>
      </div>

      {/* Progress */}
      {status === 'running' && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#64748b', marginBottom:5 }}>
            <span>ROUND PROGRESS</span>
            <span style={{ color:'#38bdf8', fontFamily:'monospace' }}>{currentRound} / {totalRounds}</span>
          </div>
          <Bar value={currentRound} max={totalRounds} color="#38bdf8" />
        </div>
      )}

      {/* Global metrics */}
      {gm && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <MetricCard label="Accuracy" value={gm.accuracy} color="#22c55e" />
          <MetricCard label="F1 Score" value={gm.f1} color="#38bdf8" />
          <MetricCard label="Precision" value={gm.precision} color="#a855f7" />
          <MetricCard label="Recall" value={gm.recall} color="#f59e0b" />
        </div>
      )}

      {/* Auth event breakdown */}
      {lastAuth && (
        <div style={{
          background:'rgba(0,0,0,0.3)', borderRadius:10, padding:12,
          border:`1px solid ${DECISION_COLOR[lastAuth.decision] ?? '#334155'}44`,
        }}>
          <div style={{ fontSize:10, color:'#64748b', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.8px' }}>
            Last Auth Event — Round {lastAuth.round}
          </div>
          {[
            { label:'Cryptographic', val: lastAuth.crypto_score, color:'#3b82f6' },
            { label:'AI Model',      val: lastAuth.ai_score,     color:'#f59e0b' },
            { label:'Witness Score', val: lastAuth.witness_score, color:'#ef4444' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                <span style={{ color:'#94a3b8' }}>{label}</span>
                <span style={{ color, fontFamily:'monospace', fontWeight:700 }}>{val?.toFixed(1)}</span>
              </div>
              <Bar value={val} max={100} color={color} />
            </div>
          ))}
          <div style={{
            marginTop:10, textAlign:'center', padding:'6px 12px', borderRadius:8, fontWeight:700, fontSize:13,
            background:`${DECISION_COLOR[lastAuth.decision] ?? '#334155'}22`,
            color: DECISION_COLOR[lastAuth.decision] ?? '#94a3b8',
            border:`1px solid ${DECISION_COLOR[lastAuth.decision] ?? '#334155'}55`,
          }}>
            {lastAuth.decision === 'APPROVED' ? '✅' : lastAuth.decision === 'REJECTED' ? '🚫' : '⚠️'} {lastAuth.decision}
            {' — '}Attack: {lastAuth.attack_scenario}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Right Panel: Controls ─────────────────────────────────────────────────────
function RightPanel() {
  const { config, setConfig, status, startSimulation, stopSimulation,
    connectWS, disconnectWS, wsConnected, fetchAllPlots } = useFLStore();

  const running = status === 'running';

  return (
    <div style={{
      position:'absolute', top:20, right:20, width:270,
      background:'linear-gradient(135deg,rgba(9,18,37,0.95),rgba(14,26,50,0.95))',
      border:'1px solid rgba(124,58,237,0.25)', borderRadius:16, padding:20,
      backdropFilter:'blur(14px)', boxShadow:'0 0 40px rgba(124,58,237,0.07),0 24px 48px rgba(0,0,0,0.6)',
      pointerEvents:'auto',
    }}>
      <div style={{ fontSize:10, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:4 }}>
        Simulation Controls
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:'#e2e8f0', marginBottom:18 }}>Configuration</div>

      {/* Connect WS */}
      <button onClick={wsConnected ? disconnectWS : connectWS} style={{
        width:'100%', padding:9, marginBottom:10, border:`1px solid ${wsConnected ? '#22c55e' : '#3b82f6'}`,
        borderRadius:9, background: wsConnected ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)',
        color: wsConnected ? '#86efac' : '#93c5fd', fontWeight:700, fontSize:12, cursor:'pointer',
      }}>
        {wsConnected ? '🔗 Connected to Backend' : '🔌 Connect to Backend'}
      </button>

      {/* Start/Stop */}
      <button
        disabled={!wsConnected}
        onClick={() => running ? stopSimulation() : startSimulation()}
        style={{
          width:'100%', padding:10, marginBottom:18, border:'none', borderRadius:10,
          background: running
            ? 'linear-gradient(135deg,#ef4444,#dc2626)'
            : 'linear-gradient(135deg,#22c55e,#16a34a)',
          color:'#0f172a', fontWeight:700, fontSize:13, cursor: wsConnected ? 'pointer' : 'not-allowed',
          opacity: wsConnected ? 1 : 0.5,
          boxShadow: running ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 20px rgba(34,197,94,0.4)',
        }}
      >
        {running ? '⏹  Stop Simulation' : '▶  Start Simulation'}
      </button>

      {/* Rounds */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.8px' }}>
          <span>FL Rounds</span>
          <span style={{ color:'#38bdf8', fontFamily:'monospace', fontWeight:700 }}>{config.rounds}</span>
        </div>
        <input type="range" min={5} max={50} step={5} value={config.rounds}
          onChange={e => setConfig({ rounds: +e.target.value })}
          disabled={running}
          style={{ width:'100%', accentColor:'#38bdf8', cursor:'pointer' }} />
      </div>

      {/* Attack fraction */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.8px' }}>
          <span>Attack Fraction</span>
          <span style={{ color:'#ef4444', fontFamily:'monospace', fontWeight:700 }}>{Math.round(config.attack * 100)}%</span>
        </div>
        <input type="range" min={0} max={0.8} step={0.05} value={config.attack}
          onChange={e => setConfig({ attack: +e.target.value })}
          disabled={running}
          style={{ width:'100%', accentColor:'#ef4444', cursor:'pointer' }} />
      </div>

      {/* Aggregation method */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, color:'#94a3b8', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.8px' }}>
          Aggregation Method
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
          {[['fedavg','FedAvg'],['krum','Krum'],['median','Median'],['fedprox','FedProx']].map(([val,lbl]) => (
            <button key={val} onClick={() => setConfig({ agg: val })} disabled={running}
              style={{
                padding:'6px 4px', fontSize:10, fontWeight:700, borderRadius:7, cursor:running?'default':'pointer',
                border:`1px solid ${config.agg===val ? '#a78bfa' : '#334155'}`,
                background: config.agg===val ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.03)',
                color: config.agg===val ? '#c4b5fd' : '#64748b', transition:'all 0.2s',
              }}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* Compare toggle */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 12px', marginBottom:12,
      }}>
        <span style={{ fontSize:11, color:'#94a3b8' }}>Run Comparison</span>
        <button onClick={() => setConfig({ compare: !config.compare })} disabled={running} style={{
          width:40, height:22, borderRadius:11, border:'none', cursor:running?'default':'pointer',
          background: config.compare ? '#a855f7' : '#374151', position:'relative', transition:'background 0.2s',
        }}>
          <div style={{
            position:'absolute', top:3, left: config.compare ? 'calc(100% - 19px)' : 3,
            width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s',
          }} />
        </button>
      </div>

      {/* Load plots button */}
      <button onClick={fetchAllPlots} style={{
        width:'100%', padding:8, border:'1px solid rgba(168,85,247,0.3)', borderRadius:8,
        background:'rgba(168,85,247,0.1)', color:'#c4b5fd', fontSize:11, fontWeight:600, cursor:'pointer',
      }}>
        📊 Load Result Plots
      </button>
    </div>
  );
}

// ── Bottom: Swarm nodes + Log ─────────────────────────────────────────────────
function BottomPanel() {
  const { swarm, activeClients, log, clearLog } = useFLStore();
  const [tab, setTab] = useState('swarm'); // swarm | log
  const logRef = React.useRef(null);

  useEffect(() => {
    if (logRef.current && tab === 'log') {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, tab]);

  const activeIds = new Set(activeClients.map(c => c.uav_id));

  return (
    <div style={{
      position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
      width:'min(800px,calc(100vw - 620px))',
      background:'linear-gradient(135deg,rgba(9,18,37,0.95),rgba(14,26,50,0.95))',
      border:'1px solid rgba(56,189,248,0.15)', borderRadius:16, padding:'14px 18px',
      backdropFilter:'blur(14px)', boxShadow:'0 0 40px rgba(0,0,0,0.5)', pointerEvents:'auto',
    }}>
      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        {[['swarm','🛸 Swarm'],['log','📋 Live Log']].map(([id,lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'4px 12px', fontSize:10, fontWeight:700, borderRadius:6, cursor:'pointer',
            border:`1px solid ${tab===id ? '#38bdf8' : '#334155'}`,
            background: tab===id ? 'rgba(56,189,248,0.15)' : 'transparent',
            color: tab===id ? '#38bdf8' : '#64748b', transition:'all 0.2s',
          }}>{lbl}</button>
        ))}
        {tab==='log' && (
          <button onClick={clearLog} style={{
            marginLeft:'auto', padding:'4px 10px', fontSize:10, fontWeight:600, borderRadius:6,
            border:'1px solid #334155', background:'transparent', color:'#64748b', cursor:'pointer',
          }}>Clear</button>
        )}
      </div>

      {tab === 'swarm' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:5 }}>
          {swarm.map(node => {
            const color   = node.is_malicious ? '#ef4444' : (ROLE_COLOR[node.role] ?? '#64748b');
            const isActive = activeIds.has(node.uav_id);
            const ac       = activeClients.find(c => c.uav_id === node.uav_id);
            return (
              <div key={node.uav_id} style={{
                display:'flex', alignItems:'center', gap:6, padding:'5px 8px',
                background:`${color}12`, border:`1px solid ${color}${isActive ? 'cc' : '33'}`,
                borderRadius:7, transition:'all 0.3s',
                boxShadow: isActive ? `0 0 10px ${color}44` : 'none',
              }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:color,
                  boxShadow: isActive ? `0 0 6px ${color}` : 'none', flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:10, color:'#e2e8f0', fontFamily:'monospace' }}>
                    UAV-{String(node.uav_id).padStart(2,'0')}
                  </div>
                  <div style={{ fontSize:9, color }}>
                    {node.role}{node.is_malicious ? ' ⚠' : ''}
                  </div>
                  {ac && (
                    <div style={{ fontSize:8, color:'#94a3b8', fontFamily:'monospace' }}>
                      acc={ac.accuracy.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {swarm.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#334155', fontSize:12, padding:'16px 0' }}>
              Start simulation to see swarm
            </div>
          )}
        </div>
      ) : (
        <div ref={logRef} style={{
          height:100, overflowY:'auto', fontFamily:'monospace', fontSize:10.5,
          display:'flex', flexDirection:'column', gap:2,
          scrollbarWidth:'thin', scrollbarColor:'#334155 transparent',
        }}>
          {log.map((entry, i) => (
            <div key={i} style={{ color: entry.color, whiteSpace:'pre' }}>{entry.txt}</div>
          ))}
          {log.length === 0 && (
            <div style={{ color:'#334155', textAlign:'center', marginTop:16 }}>No log entries yet</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Top Centre: Phase badge ───────────────────────────────────────────────────
function TopBadge() {
  const { flPhase, currentRound, totalRounds, lastAuth } = useFLStore();
  const phase = PHASE_META[flPhase] ?? PHASE_META.idle;
  const dc    = lastAuth ? (DECISION_COLOR[lastAuth.decision] ?? '#f59e0b') : null;

  return (
    <div style={{
      position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
      display:'flex', alignItems:'center', gap:10, pointerEvents:'none',
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 20px', borderRadius:10,
        background:`${phase.color}18`, border:`1px solid ${phase.color}44`, backdropFilter:'blur(8px)',
      }}>
        <span style={{ fontSize:18 }}>{phase.icon}</span>
        <div>
          <div style={{ fontSize:9, color:'#64748b', textTransform:'uppercase', letterSpacing:'1px' }}>
            {totalRounds > 0 ? `Round ${currentRound} / ${totalRounds}` : 'FL Authentication'}
          </div>
          <div style={{ fontSize:13, fontWeight:700, color: phase.color }}>{phase.label}</div>
        </div>
      </div>

      {lastAuth && (
        <div style={{
          padding:'8px 16px', borderRadius:10, backdropFilter:'blur(8px)',
          background:`${dc}18`, border:`1px solid ${dc}55`,
          fontSize:12, fontWeight:700, color: dc,
        }}>
          {lastAuth.decision === 'APPROVED' ? '✅' : lastAuth.decision === 'REJECTED' ? '🚫' : '⚠️'} {lastAuth.decision}
        </div>
      )}
    </div>
  );
}

// ── Plots Viewer ──────────────────────────────────────────────────────────────
function PlotsViewer() {
  const { plots, comparison } = useFLStore();
  const [active, setActive] = useState(null);
  const plotKeys = Object.keys(plots);

  useEffect(() => {
    if (plotKeys.length > 0 && !active) setActive(plotKeys[0]);
  }, [plotKeys.length]);

  if (plotKeys.length === 0 && !comparison) return null;

  const shortName = (fn) => fn.replace(/^\d+_/, '').replace('.png', '').replace(/_/g, ' ');

  return (
    <div style={{
      position:'absolute', bottom:20, right:20, width:460,
      background:'linear-gradient(135deg,rgba(9,18,37,0.97),rgba(14,26,50,0.97))',
      border:'1px solid rgba(168,85,247,0.2)', borderRadius:16, padding:16,
      backdropFilter:'blur(14px)', boxShadow:'0 0 40px rgba(0,0,0,0.6)',
      pointerEvents:'auto', maxHeight:'55vh', overflow:'hidden', display:'flex', flexDirection:'column',
    }}>
      <div style={{ fontSize:10, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:10 }}>
        Result Plots
      </div>

      {/* Tab strip */}
      <div style={{ display:'flex', gap:4, overflowX:'auto', marginBottom:10, flexShrink:0 }}>
        {plotKeys.map(fn => (
          <button key={fn} onClick={() => setActive(fn)} style={{
            padding:'3px 8px', fontSize:9, fontWeight:700, borderRadius:5, cursor:'pointer',
            whiteSpace:'nowrap', flexShrink:0,
            border:`1px solid ${active===fn ? '#a855f7' : '#334155'}`,
            background: active===fn ? 'rgba(168,85,247,0.2)' : 'transparent',
            color: active===fn ? '#c4b5fd' : '#64748b',
          }}>{shortName(fn)}</button>
        ))}
        {comparison && (
          <button onClick={() => setActive('comparison')} style={{
            padding:'3px 8px', fontSize:9, fontWeight:700, borderRadius:5, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
            border:`1px solid ${active==='comparison' ? '#22d3ee' : '#334155'}`,
            background: active==='comparison' ? 'rgba(34,211,238,0.15)' : 'transparent',
            color: active==='comparison' ? '#67e8f9' : '#64748b',
          }}>Comparison</button>
        )}
      </div>

      {/* Plot image */}
      {active && active !== 'comparison' && plots[active] && (
        <img src={plots[active]} alt={active} style={{ width:'100%', borderRadius:8, objectFit:'contain', flex:1 }} />
      )}

      {/* Comparison table */}
      {active === 'comparison' && comparison && (
        <div style={{ flex:1, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:'monospace' }}>
            <thead>
              <tr style={{ color:'#64748b', fontSize:10, textTransform:'uppercase' }}>
                {['Method','Accuracy','F1','Loss','Precision','Recall'].map(h => (
                  <th key={h} style={{ padding:'6px 8px', textAlign:'left', borderBottom:'1px solid #1e293b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(comparison).map(([method, m]) => (
                <tr key={method} style={{ borderBottom:'1px solid #0f172a' }}>
                  <td style={{ padding:'7px 8px', color:'#a78bfa', fontWeight:700 }}>{method.toUpperCase()}</td>
                  {[m.accuracy,m.f1,m.loss,m.precision,m.recall].map((v,i) => (
                    <td key={i} style={{ padding:'7px 8px', color:'#e2e8f0' }}>{v?.toFixed(4)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main FL Panel ─────────────────────────────────────────────────────────────
export default function FLPanel() {
  const { connectWS, wsConnected } = useFLStore();

  // Auto-connect on mount
  useEffect(() => {
    if (!wsConnected) connectWS();
  }, []);

  return (
    <div style={{
      position:'absolute', top:0, left:0, width:'100%', height:'100%',
      pointerEvents:'none', fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      <TopBadge />
      <LeftPanel />
      <RightPanel />
      <BottomPanel />
      <PlotsViewer />
    </div>
  );
}
