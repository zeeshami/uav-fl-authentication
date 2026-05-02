import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function RSU({ position, label = 'RSU', index = 0 }) {
  const auraRef  = useRef();
  const aura2Ref = useRef();
  const lightRef = useRef();
  const capRef   = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Pulsing aura rings
    if (auraRef.current) {
      const s = 1 + Math.sin(t * 1.8 + index) * 0.25;
      auraRef.current.scale.set(s, 1, s);
      auraRef.current.material.opacity = 0.4 + Math.sin(t * 1.8 + index) * 0.2;
    }
    if (aura2Ref.current) {
      const s2 = 1 + Math.sin(t * 1.8 + index + Math.PI) * 0.25;
      aura2Ref.current.scale.set(s2, 1, s2);
      aura2Ref.current.material.opacity = 0.25 + Math.sin(t * 1.8 + index + Math.PI) * 0.15;
    }
    // Cap glow
    if (capRef.current) {
      capRef.current.emissiveIntensity = 2 + Math.sin(t * 2.5 + index * 0.7) * 1.2;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 2.5 + Math.sin(t * 2 + index) * 0.8;
    }
  });

  return (
    <group position={position}>
      {/* ── Base platform ── */}
      <mesh receiveShadow castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.2, 1.5, 0.3, 6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* ── Main hexagonal tower body ── */}
      <mesh castShadow receiveShadow position={[0, 5, 0]}>
        <cylinderGeometry args={[0.4, 0.55, 9.7, 6]} />
        <meshStandardMaterial
          color="#1e3a5f"
          metalness={0.9}
          roughness={0.15}
          emissive="#1e3a5f"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* ── Mid accent ring (decorative band) ── */}
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.18, 6]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#60a5fa"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* ── Upper antenna mast ── */}
      <mesh castShadow position={[0, 10.5, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 2, 6]} />
        <meshStandardMaterial color="#0ea5e9" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* ── Antenna dish cap ── */}
      <mesh position={[0, 11.6, 0]} ref={capRef}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial
          color="#93c5fd"
          emissive="#60a5fa"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>

      {/* ── Point light (blue glow from cap) ── */}
      <pointLight
        ref={lightRef}
        position={[0, 11.5, 0]}
        color="#60a5fa"
        intensity={3}
        distance={18}
        decay={2}
      />

      {/* ── Pulsing aura ring 1 ── */}
      <mesh ref={auraRef} position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.06, 6, 30]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {/* ── Pulsing aura ring 2 (offset phase) ── */}
      <mesh ref={aura2Ref} position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.6, 0.04, 6, 30]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.3} toneMapped={false} />
      </mesh>

      {/* ── Horizontal signal dish arms ── */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.5, 7.5, Math.sin(angle) * 0.5]} castShadow>
          <boxGeometry args={[1.0, 0.06, 0.06]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.9} roughness={0.2} emissive="#0ea5e9" emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* ── HTML label ── */}
      <Html position={[0, 13, 0]} center distanceFactor={30} zIndexRange={[50, 0]}>
        <div style={{
          background: 'rgba(14,165,233,0.15)',
          border: '1px solid #38bdf8',
          color: '#7dd3fc',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)',
        }}>
          {label}
        </div>
      </Html>
    </group>
  );
}
