import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

const ROAD_SPEED = 4.0; // units per second
const ROAD_HALF  = 38;  // half-length of road segment

// Lane definitions (must match store.js ROAD_PATHS)
const LANES = [
  { axis: 'x', fixed: 'z', fixedVal: -4, dir:  1 },
  { axis: 'x', fixed: 'z', fixedVal:  4, dir: -1 },
  { axis: 'z', fixed: 'x', fixedVal: -8, dir:  1 },
  { axis: 'z', fixed: 'x', fixedVal:  8, dir: -1 },
];

export default function Vehicle({ vehicle, showTrustScore }) {
  const groupRef  = useRef();
  const lightRef  = useRef();
  const glowRef   = useRef();
  const matRef    = useRef();
  const cabinRef  = useRef();

  // Per-vehicle stable offset so they don't all start at the same spot
  const posRef = useRef(vehicle.offset ?? 0);

  const lane = LANES[vehicle.lane ?? 0];
  const isMalicious = vehicle.isMalicious;
  const isExcluded  = vehicle.excluded;

  // Colours
  const trustColor   = isMalicious ? '#ef4444' : '#22c55e';
  const bodyColor    = isMalicious ? '#3b1515' : '#1e293b';
  const accentColor  = isMalicious ? '#ef4444' : '#22d3ee';

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // ── Drive along lane ──────────────────────────────────────────────────────
    posRef.current += lane.dir * ROAD_SPEED * delta;
    if (posRef.current >  ROAD_HALF) posRef.current = -ROAD_HALF;
    if (posRef.current < -ROAD_HALF) posRef.current =  ROAD_HALF;

    const px = lane.axis === 'x' ? posRef.current : lane.fixedVal;
    const pz = lane.axis === 'z' ? posRef.current : lane.fixedVal;

    // ── Malicious jitter ───────────────────────────────────────────────────────
    const jx = isMalicious ? (Math.random() - 0.5) * 0.06 : 0;
    const jz = isMalicious ? (Math.random() - 0.5) * 0.06 : 0;

    groupRef.current.position.set(px + jx, 0, pz + jz);

    // Orient in direction of travel
    const angle = lane.axis === 'x'
      ? (lane.dir > 0 ? 0 : Math.PI)
      : (lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    groupRef.current.rotation.y = angle;

    // ── Trust light pulse ─────────────────────────────────────────────────────
    if (lightRef.current) {
      lightRef.current.intensity = isExcluded
        ? 0
        : (isMalicious
            ? 1.5 + Math.sin(t * 8) * 1.5          // fast red flicker
            : 1.0 + Math.sin(t * 2) * 0.4);         // slow green pulse
    }

    // ── Excluded fade ─────────────────────────────────────────────────────────
    const targetOpacity = isExcluded ? 0.22 : 1.0;
    if (matRef.current) {
      matRef.current.opacity += (targetOpacity - matRef.current.opacity) * 0.08;
      matRef.current.transparent = isExcluded;
    }
    if (cabinRef.current) {
      cabinRef.current.opacity += (targetOpacity - cabinRef.current.opacity) * 0.08;
      cabinRef.current.transparent = isExcluded;
    }
  });

  return (
    <group ref={groupRef}>
      {/* ── Chassis ── */}
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[2.4, 0.5, 1.2]} />
        <meshStandardMaterial
          ref={matRef}
          color={bodyColor}
          metalness={0.85}
          roughness={0.2}
          emissive={isExcluded ? '#111' : bodyColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* ── Cabin ── */}
      <mesh castShadow position={[0.1, 0.85, 0]}>
        <boxGeometry args={[1.2, 0.55, 1.0]} />
        <meshStandardMaterial
          ref={cabinRef}
          color={isMalicious ? '#2a1010' : '#172035'}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* ── Front accent strip (trust colour) ── */}
      <mesh position={[1.22, 0.42, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.9]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={trustColor}
          emissiveIntensity={isMalicious ? (Math.random() > 0.5 ? 3 : 1) : 2}
          toneMapped={false}
        />
      </mesh>

      {/* ── Wheels (4 corners) ── */}
      {[[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].map(([wx, wz], i) => (
        <mesh key={i} castShadow position={[wx, 0.18, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.14, 10]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.6} />
        </mesh>
      ))}

      {/* ── Trust point light ── */}
      <pointLight
        ref={lightRef}
        position={[0, 1.2, 0]}
        color={trustColor}
        intensity={1.5}
        distance={5}
        decay={2}
      />

      {/* ── Ground glow disc ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[2.8, 1.6]} />
        <meshBasicMaterial
          color={trustColor}
          transparent
          opacity={isExcluded ? 0 : 0.12}
          toneMapped={false}
        />
      </mesh>

      {/* ── Trust score label ── */}
      {showTrustScore && !isExcluded && (
        <Html position={[0, 1.8, 0]} center distanceFactor={25} zIndexRange={[20, 0]}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0,0,0,0.7)',
            border: `1px solid ${trustColor}`,
            borderRadius: '4px',
            padding: '2px 6px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: trustColor, boxShadow: `0 0 4px ${trustColor}`,
            }} />
            <span style={{ color: trustColor, fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}>
              {vehicle.trustScore}%
            </span>
          </div>
        </Html>
      )}

      {/* ── Excluded overlay label ── */}
      {isExcluded && (
        <Html position={[0, 2.2, 0]} center distanceFactor={25} zIndexRange={[20, 0]}>
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '8px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            pointerEvents: 'none',
          }}>
            EXCLUDED
          </div>
        </Html>
      )}
    </group>
  );
}
