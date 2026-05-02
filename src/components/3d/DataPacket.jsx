import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function DataPacket({ from, to, progress, distorted, color }) {
  const meshRef = useRef();
  const matRef  = useRef();

  // Quadratic arc path
  const { curve } = useMemo(() => {
    const f   = new THREE.Vector3(...from);
    const t   = new THREE.Vector3(...to);
    const mid = f.clone().lerp(t, 0.5).setY(6 + Math.random() * 3);
    const curve = new THREE.QuadraticBezierCurve3(f, mid, t);
    return { curve };
  }, []); // eslint-disable-line

  const posVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!meshRef.current) return;

    // Sample position along arc
    const p = Math.min(progress, 0.999);
    curve.getPoint(p, posVec);

    // Malicious: add jitter
    const jx = distorted ? (Math.random() - 0.5) * 0.2 : 0;
    const jy = distorted ? (Math.random() - 0.5) * 0.2 : 0;
    const jz = distorted ? (Math.random() - 0.5) * 0.2 : 0;

    meshRef.current.position.set(posVec.x + jx, posVec.y + jy, posVec.z + jz);

    // Rotation
    meshRef.current.rotation.x += 0.05;
    meshRef.current.rotation.y += 0.08;

    // Malicious: flickering opacity
    if (matRef.current) {
      if (distorted) {
        matRef.current.opacity = 0.5 + Math.sin(t * 18) * 0.5;
        matRef.current.emissiveIntensity = 1 + Math.sin(t * 20) * 2;
      } else {
        matRef.current.opacity = 0.85 + Math.sin(t * 3) * 0.1;
        matRef.current.emissiveIntensity = 2 + Math.sin(t * 4) * 0.5;
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Trusted: smooth sphere. Malicious: icosahedron (jagged) */}
      {distorted
        ? <icosahedronGeometry args={[0.28, 0]} />
        : <sphereGeometry args={[0.22, 10, 10]} />
      }
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        transparent
        opacity={0.9}
        toneMapped={false}
      />
    </mesh>
  );
}
