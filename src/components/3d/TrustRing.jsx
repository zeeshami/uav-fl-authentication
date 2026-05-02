import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export default function TrustRing({ position, active }) {
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (active) {
      startTimeRef.current = null; // reset to re-trigger animation
    }
  }, [active]);

  useFrame(({ clock }) => {
    if (!active) {
      [ring1Ref, ring2Ref, ring3Ref].forEach(r => {
        if (r.current) r.current.scale.setScalar(0.01);
      });
      return;
    }

    const now = clock.getElapsedTime();
    if (startTimeRef.current === null) startTimeRef.current = now;
    const elapsed = now - startTimeRef.current;

    // Three rings expand outward with staggered delays
    const rings = [
      { ref: ring1Ref, delay: 0,   baseRadius: 2.5, speed: 1.2 },
      { ref: ring2Ref, delay: 0.3, baseRadius: 1.8, speed: 1.0 },
      { ref: ring3Ref, delay: 0.6, baseRadius: 1.2, speed: 0.9 },
    ];

    rings.forEach(({ ref, delay, baseRadius, speed }) => {
      const t = Math.max(0, elapsed - delay);
      const loop = (t * speed) % 2.5; // loop period
      const scale = 1 + loop * 0.8;
      const opacity = Math.max(0, 1 - loop / 2.5);

      if (ref.current) {
        ref.current.scale.setScalar(scale);
        if (ref.current.material) {
          ref.current.material.opacity = opacity * 0.7;
        }
      }
    });
  });

  if (!active) return null;

  const ringY = (position[1] ?? 0) + 0.5;

  return (
    <group position={[position[0], ringY, position[2]]}>
      {/* Ring 1 — tight */}
      <mesh ref={ring1Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.5, 0.1, 6, 40]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.7} toneMapped={false} />
      </mesh>

      {/* Ring 2 — mid */}
      <mesh ref={ring2Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.07, 6, 40]} />
        <meshBasicMaterial color="#4ade80" transparent opacity={0.5} toneMapped={false} />
      </mesh>

      {/* Ring 3 — outer */}
      <mesh ref={ring3Ref} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.05, 6, 40]} />
        <meshBasicMaterial color="#86efac" transparent opacity={0.4} toneMapped={false} />
      </mesh>

      {/* Static floor glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.06} toneMapped={false} />
      </mesh>
    </group>
  );
}
