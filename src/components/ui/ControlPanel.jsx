import React from 'react';
import { useSimStore } from '../../store';
import { Play, Pause, FastForward, Shield, AlertTriangle, Eye, Settings } from 'lucide-react';

export default function ControlPanel() {
  const { 
    isSimulationRunning, toggleSimulation, 
    playbackSpeed, setPlaybackSpeed,
    attackMode, setAttackMode,
    mode 
  } = useSimStore();

  return (
    <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', pointerEvents: 'auto' }}>
      
      {/* Playback Controls */}
      <div>
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Simulation Controls</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={btnStyle} onClick={toggleSimulation}>
            {isSimulationRunning ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button style={{...btnStyle, ...(playbackSpeed === 1 ? activeStyle : {})}} onClick={() => setPlaybackSpeed(1)}>
            1x
          </button>
          <button style={{...btnStyle, ...(playbackSpeed === 2 ? activeStyle : {})}} onClick={() => setPlaybackSpeed(2)}>
            2x
          </button>
          <button style={{...btnStyle, ...(playbackSpeed === 5 ? activeStyle : {})}} onClick={() => setPlaybackSpeed(5)}>
            <FastForward size={18} /> 5x
          </button>
        </div>
      </div>

      <hr style={{ borderColor: 'var(--panel-border)', opacity: 0.5, margin: '4px 0' }} />

      {/* Attack Scenarios */}
      {mode === 'handover' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Threat injection</h3>
          <AttackBtn active={attackMode === 'none'} onClick={() => setAttackMode('none')} icon={<Shield size={16}/>} label="Secure Mode" color="var(--accent-green)"/>
          <AttackBtn active={attackMode === 'spoofing'} onClick={() => setAttackMode('spoofing')} icon={<AlertTriangle size={16}/>} label="Spoof Receiver [MAC]" color="var(--accent-red)"/>
          <AttackBtn active={attackMode === 'rogue'} onClick={() => setAttackMode('rogue')} icon={<Eye size={16}/>} label="Rogue Drone Intrusion" color="var(--accent-red)"/>
          <AttackBtn active={attackMode === 'abnormal'} onClick={() => setAttackMode('abnormal')} icon={<Settings size={16}/>} label="Abnormal Trajectory" color="var(--accent-yellow)"/>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  flex: 1,
  padding: '8px',
  backgroundColor: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '4px',
  transition: '0.2s',
};

const activeStyle = {
  backgroundColor: 'rgba(56, 189, 248, 0.2)',
  borderColor: 'var(--accent-blue)',
};

function AttackBtn({ active, onClick, icon, label, color }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px',
        backgroundColor: active ? `${color}22` : 'rgba(15,23,42,0.4)',
        border: `1px solid ${active ? color : 'rgba(255,255,255,0.05)'}`,
        color: active ? color : 'var(--text-secondary)',
        borderRadius: '6px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: '0.2s'
      }}
    >
      {icon}
      <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
    </button>
  );
}
