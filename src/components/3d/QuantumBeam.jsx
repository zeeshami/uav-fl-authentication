import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NUM_PHOTONS = 10;

export default function QuantumBeam({ from, to, encryptionMode = 'pqc' }) {
  const tubeMatRef    = useRef();
  const photonRefs    = useRef([]);
  const progressRef   = useRef(
    Array.from({ length: NUM_PHOTONS }, (_, i) => i / NUM_PHOTONS)
  );

  const colorA = encryptionMode === 'pqc' ? '#7c3aed' : '#0ea5e9';
  const colorB = encryptionMode === 'pqc' ? '#60a5fa' : '#38bdf8';

  // Build the curve once (from positions update each frame via useFrame)
  const { curve, tubeGeo } = useMemo(() => {
    const f = new THREE.Vector3(...from);
    const t = new THREE.Vector3(...to);
    const mid = f.clone().lerp(t, 0.5).setY(Math.max(f.y, t.y) + 4);
    const curve = new THREE.CatmullRomCurve3([f, mid, t]);
    const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.04, 6, false);
    return { curve, tubeGeo };
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);  // eslint-disable-line

  // Photon positions (shared lookup)
  const photonPositions = useMemo(
    () => Array.from({ length: NUM_PHOTONS }, (_, i) => new THREE.Vector3()),
    []
  );

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // Pulsing tube opacity/color
    if (tubeMatRef.current) {
      tubeMatRef.current.opacity = 0.45 + Math.sin(t * 3) * 0.25;
      const lerpFactor = (Math.sin(t * 2.5) + 1) / 2;
      tubeMatRef.current.color.set(
        new THREE.Color(colorA).lerp(new THREE.Color(colorB), lerpFactor)
      );
    }

    // Animate photons along curve
    progressRef.current = progressRef.current.map((p) => (p + delta * 0.55) % 1);
    progressRef.current.forEach((progress, i) => {
      curve.getPoint(progress, photonPositions[i]);
      const ref = photonRefs.current[i];
      if (ref) {
        ref.position.copy(photonPositions[i]);
        // Individual flicker
        const scale = 0.5 + Math.sin(t * 8 + i * 1.3) * 0.3;
        ref.scale.setScalar(scale);
        ref.material.opacity = 0.6 + Math.sin(t * 6 + i * 2) * 0.4;
        ref.material.emissiveIntensity = 2 + Math.sin(t * 5 + i) * 1.5;
      }
    });
  });

  return (
    <group>
      {/* ── Tube ── */}
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial
          ref={tubeMatRef}
          color={colorA}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>

      {/* ── Photon particles ── */}
      {Array.from({ length: NUM_PHOTONS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => (photonRefs.current[i] = el)}
        >
          <sphereGeometry args={[0.09, 6, 6]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? colorA : colorB}
            emissive={i % 2 === 0 ? colorA : colorB}
            emissiveIntensity={3}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
