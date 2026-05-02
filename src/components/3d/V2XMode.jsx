import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useV2XStore } from '../../store';

import V2XRoad     from './V2XRoad';
import Vehicle     from './Vehicle';
import RSU         from './RSU';
import QuantumBeam from './QuantumBeam';
import DataPacket  from './DataPacket';
import TrustRing   from './TrustRing';

// ── RSU world positions ───────────────────────────────────────────────────────
const RSU_POSITIONS = [
  [-18, 0,  0],
  [  0, 0, -18],
  [ 18, 0,  0],
];

// ── Phase durations (seconds) ─────────────────────────────────────────────────
const PHASE_DURATIONS = {
  idle:           2.0,
  local_training: 3.5,
  pqc_exchange:   2.5,
  aggregation:    3.0,
  consensus:      2.5,
  excluded:       1.5,
};

export default function V2XMode() {
  const {
    isRunning,
    vehicles,
    packets,
    flPhase,
    encryptionMode,
    showTrustScores,
    initV2X,
    advancePhase,
    tickPackets,
  } = useV2XStore();

  const phaseTimerRef = useRef(0);

  // Initialise vehicles once
  useEffect(() => {
    initV2X();
  }, []); // eslint-disable-line

  // ── Per-frame simulation tick ─────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!isRunning) return;

    // Advance phase timer
    phaseTimerRef.current += delta;
    const phaseDuration = PHASE_DURATIONS[flPhase] ?? 2;
    if (phaseTimerRef.current >= phaseDuration) {
      phaseTimerRef.current = 0;
      advancePhase();
    }

    // Tick packet progress during aggregation
    if (flPhase === 'aggregation') {
      tickPackets(delta);
    }
  });

  const isQKDActive  = flPhase === 'pqc_exchange';
  const isConsensus  = flPhase === 'consensus' || flPhase === 'excluded';

  return (
    <group>
      {/* ── Static environment ── */}
      <V2XRoad />

      {/* ── RSU towers ── */}
      {RSU_POSITIONS.map((pos, i) => (
        <RSU key={i} position={pos} label={`RSU-${i + 1}`} index={i} />
      ))}

      {/* ── Trust rings around RSUs during consensus ── */}
      {RSU_POSITIONS.map((pos, i) => (
        <TrustRing key={`ring-${i}`} position={pos} active={isConsensus} />
      ))}

      {/* ── Vehicles ── */}
      {vehicles.map((v) => (
        <Vehicle
          key={v.id}
          vehicle={v}
          showTrustScore={showTrustScores}
        />
      ))}

      {/* ── Quantum beams — vehicle → nearest RSU ── */}
      {isQKDActive && vehicles.map((v) => {
        const rsuPos = RSU_POSITIONS[v.id % RSU_POSITIONS.length];
        return (
          <QuantumBeam
            key={`qb-${v.id}`}
            from={[v.position[0], 0.8, v.position[2]]}
            to={[rsuPos[0], 8, rsuPos[2]]}
            encryptionMode={encryptionMode}
          />
        );
      })}

      {/* ── Data packets in flight ── */}
      {packets.map((pkt) => {
        const vehicleData = vehicles.find((v) => v.id === pkt.vehicleId);
        if (!vehicleData) return null;
        const rsuPos = RSU_POSITIONS[pkt.rsuIndex];
        return (
          <DataPacket
            key={pkt.id}
            from={[vehicleData.position[0], 0.8, vehicleData.position[2]]}
            to={[rsuPos[0], 5, rsuPos[2]]}
            progress={pkt.progress}
            color={pkt.color}
            distorted={pkt.distorted}
          />
        );
      })}
    </group>
  );
}
