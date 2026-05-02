import React from 'react';
import { useAuthStore, useSimStore } from '../../store';
import { Fingerprint, BrainCircuit, ScanEye, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

export default function DataPanel() {
  const mode = useSimStore(s => s.mode);
  const { cryptoScore, aiScore, witnessScore, trustLevel } = useAuthStore();

  if (mode !== 'handover') return null;

  return (
    <div className="glass-panel" style={{ width: '320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', pointerEvents: 'auto' }}>
      
      <div>
        <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Trust Fusion</h3>
        
        <ScoreRow label="Crypto / MAC" score={cryptoScore} icon={<Fingerprint size={16}/>} weight="40%" />
        <ScoreRow label="AI Trajectory" score={aiScore} icon={<BrainCircuit size={16}/>} weight="40%" />
        <ScoreRow label="Witness Sensor" score={witnessScore} icon={<ScanEye size={16}/>} weight="20%" />
      </div>

      <div style={{
        marginTop: '10px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: trustLevel === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 
                       trustLevel === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.05)',
        border: `1px solid ${trustLevel === 'approved' ? 'var(--accent-green)' : 
                            trustLevel === 'rejected' ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{ color: trustLevel === 'approved' ? 'var(--accent-green)' : 
                           trustLevel === 'rejected' ? 'var(--accent-red)' : 'var(--accent-blue)' }}>
          {trustLevel === 'approved' ? <ShieldCheck size={32} /> : 
           trustLevel === 'rejected' ? <ShieldAlert size={32} /> : <Cpu size={32} />}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px',
          color: trustLevel === 'approved' ? 'var(--accent-green)' : 
                 trustLevel === 'rejected' ? 'var(--accent-red)' : 'var(--accent-blue)'
        }}>
          {trustLevel === 'approved' ? 'Transfer Approved' : 
           trustLevel === 'rejected' ? 'Transfer Rejected' : 'Computing...'}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, score, icon, weight }) {
  const color = score > 80 ? 'var(--accent-green)' : score > 50 ? 'var(--accent-yellow)' : 'var(--accent-red)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
          {label} <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>({weight})</span>
        </div>
        <div style={{ fontWeight: '600', color }}>{score.toFixed(1)}%</div>
      </div>
      <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', backgroundColor: color, transition: 'width 0.3s ease-out' }} />
      </div>
    </div>
  );
}
