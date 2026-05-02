import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useFLStore } from '../../store';

// ── UAV node colours by role ──────────────────────────────────────────────────
const ROLE_COLOR = {
  sender:   '#3b82f6',
  receiver: '#eab308',
  witness:  '#ef4444',
  relay:    '#64748b',
};

const MAL_COLOR = '#ff2222';

// ── Position UAVs in a circle around a central aggregation node ───────────────
function getUAVPositions(count, radius = 14) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle) * radius, 8 + Math.sin(i * 0.7) * 1.5, Math.sin(angle) * radius];
  });
}

// ── Single UAV mesh ───────────────────────────────────────────────────────────
function UAVNode({ position, role, isMalicious, isActive, uavId, trustScore = 100 }) {
  const meshRef  = useRef();
  const ringRef  = useRef();
  const glowRef  = useRef();

  const baseColor = isMalicious ? MAL_COLOR : (ROLE_COLOR[role] ?? '#94a3b8');

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(t * 1.2 + uavId) * 0.25;
      meshRef.current.rotation.y += 0.008;
    }
    if (ringRef.current && isActive) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 3 + uavId) * 0.12);
      ringRef.current.material.opacity = 0.35 + Math.sin(t * 4) * 0.15;
    }
    if (glowRef.current && isMalicious) {
      glowRef.current.material.opacity = 0.4 + Math.sin(t * 6) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Body */}
      <group ref={meshRef}>
        {/* Main fuselage */}
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.3, 0.6]} />
          <meshStandardMaterial color={baseColor} emissive={baseColor} emissiveIntensity={0.4} roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Arms */}
        {[[-0.8, 0, -0.6], [0.8, 0, -0.6], [-0.8, 0, 0.6], [0.8, 0, 0.6]].map((p, i) => (
          <mesh key={i} position={p}>
            <cylinderGeometry args={[0.05, 0.05, 0.8, 6]} />
            <meshStandardMaterial color={baseColor} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {/* Rotors */}
        {[[-0.8, 0.18, -0.6], [0.8, 0.18, -0.6], [-0.8, 0.18, 0.6], [0.8, 0.18, 0.6]].map((p, i) => (
          <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.04, 8]} />
            <meshBasicMaterial color={baseColor} transparent opacity={0.6} />
          </mesh>
        ))}
        {/* LED under */}
        <pointLight color={baseColor} intensity={isMalicious ? 1.5 : 0.6} distance={4} decay={2} position={[0, -0.3, 0]} />
      </group>

      {/* Active training ring */}
      {isActive && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <ringGeometry args={[1.6, 1.8, 32]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Malicious pulse glow */}
      {isMalicious && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.4, 12, 12]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}

// ── Animated data packet travelling between two points ────────────────────────
function DataPacket({ start, end, color, speed = 1.4 }) {
  const ref      = useRef();
  const progress = useRef(Math.random());

  useFrame((_, delta) => {
    progress.current = (progress.current + delta * speed) % 1;
    if (ref.current) {
      ref.current.position.lerpVectors(
        new THREE.Vector3(...start),
        new THREE.Vector3(...end),
        progress.current
      );
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.2, 6, 6]} />
      <meshBasicMaterial color={color} />
      <pointLight color={color} intensity={0.8} distance={3} decay={2} />
    </mesh>
  );
}

// ── Line between two 3D points ─────────────────────────────────────────────
function Line({ start, end, color, opacity = 0.25 }) {
  const points   = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

// ── Central aggregation server node ─────────────────────────────────────────
function AggregationServer({ flPhase }) {
  const ref      = useRef();
  const ringRef1 = useRef();
  const ringRef2 = useRef();

  const phaseColor = {
    idle:           '#334155',
    local_training: '#f59e0b',
    aggregation:    '#22d3ee',
    auth_event:     '#22c55e',
    complete:       '#a855f7',
    error:          '#ef4444',
  }[flPhase] ?? '#334155';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += 0.012;
    if (ringRef1.current) {
      ringRef1.current.rotation.z += 0.015;
      ringRef1.current.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z -= 0.01;
      ringRef2.current.scale.setScalar(1 + Math.cos(t * 2.5) * 0.06);
    }
  });

  return (
    <group position={[0, 8, 0]}>
      <mesh ref={ref} castShadow>
        <icosahedronGeometry args={[1.8, 1]} />
        <meshStandardMaterial color={phaseColor} emissive={phaseColor} emissiveIntensity={0.5} metalness={0.8} roughness={0.2} wireframe />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial color={phaseColor} emissive={phaseColor} emissiveIntensity={0.3} transparent opacity={0.4} />
      </mesh>
      {/* Orbit rings */}
      <mesh ref={ringRef1} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[2.4, 2.6, 48]} />
        <meshBasicMaterial color={phaseColor} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef2} rotation={[-Math.PI / 4, Math.PI / 5, 0]}>
        <ringGeometry args={[2.8, 2.95, 48]} />
        <meshBasicMaterial color={phaseColor} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={phaseColor} intensity={3} distance={20} decay={2} />
    </group>
  );
}

// ── Main scene ────────────────────────────────────────────────────────────────
export default function FLSwarmMode() {
  const { swarm, flPhase, activeClients, lastAuth, currentRound, totalRounds } = useFLStore();

  const positions = getUAVPositions(Math.max(swarm.length, 1));
  const CENTER    = [0, 8, 0];

  const activeIds  = new Set(activeClients.map(c => c.uav_id));
  const witnesses  = swarm.filter(n => n.role === 'witness');
  const sender     = swarm.find(n => n.role === 'sender');
  const receiver   = swarm.find(n => n.role === 'receiver');

  const authDecision = lastAuth?.decision;
  const authColor    = authDecision === 'APPROVED' ? '#22c55e' : authDecision === 'REJECTED' ? '#ef4444' : '#f59e0b';

  return (
    <group>
      {/* Ground */}
      <mesh receiveShadow position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#050a14" roughness={0.8} />
      </mesh>
      <gridHelper args={[120, 24, '#1e293b', '#0f172a']} position={[0, -0.4, 0]} />

      {/* Aggregation server */}
      <AggregationServer flPhase={flPhase} />

      {/* UAV nodes */}
      {swarm.map((node, i) => (
        <UAVNode
          key={node.uav_id}
          position={positions[i] ?? [0, 8, 0]}
          role={node.role}
          isMalicious={node.is_malicious}
          isActive={activeIds.has(node.uav_id)}
          uavId={node.uav_id}
        />
      ))}

      {/* Static connection lines from each UAV to aggregation server */}
      {swarm.map((node, i) => {
        const pos = positions[i] ?? [0, 8, 0];
        const color = node.is_malicious ? '#ef4444' : (ROLE_COLOR[node.role] ?? '#64748b');
        return (
          <Line key={node.uav_id} start={[pos[0], pos[1], pos[2]]} end={CENTER} color={color} opacity={0.12} />
        );
      })}

      {/* Active client → server data packets */}
      {flPhase === 'local_training' && activeClients.map(c => {
        const idx = swarm.findIndex(n => n.uav_id === c.uav_id);
        const pos = positions[idx] ?? [0, 8, 0];
        return (
          <DataPacket key={c.uav_id} start={[pos[0], pos[1], pos[2]]} end={CENTER}
            color={c.is_malicious ? '#ef4444' : '#38bdf8'} speed={1.2} />
        );
      })}

      {/* Auth event: witness → sender lines */}
      {lastAuth && sender && witnesses.map(w => {
        const wi  = swarm.findIndex(n => n.uav_id === w.uav_id);
        const si  = swarm.findIndex(n => n.uav_id === sender.uav_id);
        const wp  = positions[wi] ?? [0, 8, 0];
        const sp  = positions[si] ?? [0, 8, 0];
        return (
          <Line key={w.uav_id} start={wp} end={sp} color={authColor} opacity={0.6} />
        );
      })}

      {/* Auth glow ring between sender and receiver */}
      {lastAuth && sender && receiver && (() => {
        const si = swarm.findIndex(n => n.uav_id === sender.uav_id);
        const ri = swarm.findIndex(n => n.uav_id === receiver.uav_id);
        const sp = positions[si] ?? [0, 8, 0];
        const rp = positions[ri] ?? [0, 8, 0];
        const mid = [(sp[0]+rp[0])/2, (sp[1]+rp[1])/2, (sp[2]+rp[2])/2];
        return (
          <group position={mid}>
            <mesh>
              <sphereGeometry args={[1.2, 16, 16]} />
              <meshBasicMaterial color={authColor} transparent opacity={0.2} />
            </mesh>
            <pointLight color={authColor} intensity={2} distance={12} decay={2} />
          </group>
        );
      })()}
    </group>
  );
}
