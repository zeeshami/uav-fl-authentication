import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Plane } from '@react-three/drei';
import * as THREE from 'three';

// ── Streetlight ────────────────────────────────────────────────────────────────
function Streetlight({ position }) {
  const glowRef = useRef();
  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.intensity = 2.2 + Math.sin(clock.getElapsedTime() * 1.4) * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.1, 4, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.6, 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 6]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[1.2, 2, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#60a5fa"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      {/* Point light */}
      <pointLight
        ref={glowRef}
        position={[1.2, 2, 0]}
        color="#60a5fa"
        intensity={2.5}
        distance={12}
        decay={2}
      />
    </group>
  );
}

// ── Glowing lane marker strip ──────────────────────────────────────────────────
function LaneMarker({ position, rotation, length }) {
  const matRef = useRef();
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.6 + Math.sin(clock.getElapsedTime() * 2) * 0.2;
    }
  });
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <planeGeometry args={[0.15, length]} />
      <meshStandardMaterial
        ref={matRef}
        color="#38bdf8"
        emissive="#38bdf8"
        emissiveIntensity={0.7}
        toneMapped={false}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// ── Building silhouette ────────────────────────────────────────────────────────
function CityBlock({ position, width, depth, height, color }) {
  return (
    <mesh position={[position[0], height / 2, position[2]]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
    </mesh>
  );
}

// ── Main V2X Road ──────────────────────────────────────────────────────────────
export default function V2XRoad() {
  const ROAD_LEN = 80;

  const streetlightPositions = [
    [-20, 2, -7], [-10, 2, -7], [0, 2, -7], [10, 2, -7], [20, 2, -7],
    [-20, 2,  7], [-10, 2,  7], [0, 2,  7], [10, 2,  7], [20, 2,  7],
    [-11, 2, -18], [-11, 2, -8], [-11, 2, 2], [-11, 2, 12], [-11, 2, 22],
    [ 11, 2, -18], [ 11, 2, -8], [ 11, 2, 2], [ 11, 2, 12], [ 11, 2, 22],
  ];

  const buildings = [
    // Left cluster
    { pos: [-28, 0, -18], w: 8, d: 10, h: 22, color: '#0f172a' },
    { pos: [-22, 0, -22], w: 6, d: 7,  h: 16, color: '#1e293b' },
    { pos: [-35, 0, -14], w: 10, d: 8, h: 28, color: '#0c1a2e' },
    { pos: [-32, 0, -26], w: 7, d: 9,  h: 18, color: '#162033' },
    { pos: [-18, 0, -28], w: 9, d: 8,  h: 14, color: '#1a2640' },
    // Right cluster
    { pos: [28, 0, -18],  w: 8, d: 10, h: 24, color: '#0f172a' },
    { pos: [22, 0, -22],  w: 6, d: 7,  h: 17, color: '#1e293b' },
    { pos: [35, 0, -14],  w: 10, d: 8, h: 30, color: '#0c1a2e' },
    { pos: [32, 0, -26],  w: 7, d: 9,  h: 20, color: '#162033' },
    { pos: [18, 0, -28],  w: 9, d: 8,  h: 15, color: '#1a2640' },
    // Back row
    { pos: [-8, 0, -32],  w: 10, d: 7, h: 32, color: '#091525' },
    { pos: [0,  0, -35],  w: 8, d: 8,  h: 26, color: '#0f172a' },
    { pos: [8,  0, -32],  w: 10, d: 7, h: 29, color: '#091525' },
    // Side clusters
    { pos: [-32, 0, 18],  w: 9, d: 8,  h: 20, color: '#1a2640' },
    { pos: [32, 0, 18],   w: 9, d: 8,  h: 22, color: '#1a2640' },
  ];

  return (
    <group>
      {/* ── Dark asphalt ground ── */}
      <Plane
        args={[200, 200]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#0d1117" roughness={0.9} metalness={0.1} />
      </Plane>

      {/* ── Subtle grid overlay ── */}
      <gridHelper args={[200, 80, '#1e3a5f', '#1e3a5f']} position={[0, 0.01, 0]} />

      {/* ── Main horizontal road (X axis) ── */}
      <Plane args={[ROAD_LEN, 14]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color="#141e2e" roughness={0.8} metalness={0.2} />
      </Plane>

      {/* ── Cross road (Z axis) ── */}
      <Plane args={[14, ROAD_LEN]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color="#141e2e" roughness={0.8} metalness={0.2} />
      </Plane>

      {/* ── Center divider lines — horizontal road ── */}
      <LaneMarker position={[0, 0.04, 0]}    rotation={[-Math.PI / 2, 0, 0]} length={ROAD_LEN} />
      {/* Edges */}
      <LaneMarker position={[0, 0.04, -6.8]} rotation={[-Math.PI / 2, 0, 0]} length={ROAD_LEN} />
      <LaneMarker position={[0, 0.04,  6.8]} rotation={[-Math.PI / 2, 0, 0]} length={ROAD_LEN} />

      {/* ── Center divider lines — vertical road ── */}
      <LaneMarker position={[0, 0.04, 0]}    rotation={[-Math.PI / 2, 0, Math.PI / 2]} length={ROAD_LEN} />
      <LaneMarker position={[-6.8, 0.04, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} length={ROAD_LEN} />
      <LaneMarker position={[ 6.8, 0.04, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} length={ROAD_LEN} />

      {/* ── Intersection glow ── */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <meshBasicMaterial color="#1d4ed8" transparent opacity={0.12} />
      </mesh>

      {/* ── Streetlights ── */}
      {streetlightPositions.map((pos, i) => (
        <Streetlight key={i} position={pos} />
      ))}

      {/* ── City buildings (dark silhouettes) ── */}
      {buildings.map((b, i) => (
        <CityBlock
          key={i}
          position={b.pos}
          width={b.w}
          depth={b.d}
          height={b.h}
          color={b.color}
        />
      ))}

      {/* ── Building window glow accents ── */}
      {buildings.slice(0, 8).map((b, i) => (
        <pointLight
          key={`blight-${i}`}
          position={[b.pos[0], b.h * 0.6, b.pos[2]]}
          color={i % 2 === 0 ? '#1d4ed8' : '#7c3aed'}
          intensity={0.8}
          distance={10}
          decay={2}
        />
      ))}

      {/* ── Ambient city fog plane ── */}
      <mesh position={[0, 8, -15]} rotation={[-Math.PI / 6, 0, 0]}>
        <planeGeometry args={[120, 40]} />
        <meshBasicMaterial color="#0d1b2a" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
