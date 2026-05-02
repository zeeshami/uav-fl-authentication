import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

export default function DeliveryBox({ position, rotation = [0, 0, 0], state = 'idle', hatchOpen = false }) {
  const ledRef = useRef();
  const hatchLeftRef = useRef();
  const hatchRightRef = useRef();

  useFrame((stateObj) => {
    // LED pulsing
    if (state === 'active' && ledRef.current) {
      const intensity = Math.sin(stateObj.clock.elapsedTime * 8) * 0.5 + 0.5;
      ledRef.current.emissiveIntensity = 1 + intensity * 2;
    } else if (ledRef.current) {
      ledRef.current.emissiveIntensity = 2; // Flat glow for other states
    }

    // Hatch animation
    if (hatchLeftRef.current && hatchRightRef.current) {
      const targetLeft = hatchOpen ? -0.8 : -0.35;
      const targetRight = hatchOpen ? 0.8 : 0.35;
      hatchLeftRef.current.position.x = THREE.MathUtils.lerp(hatchLeftRef.current.position.x, targetLeft, 0.05);
      hatchRightRef.current.position.x = THREE.MathUtils.lerp(hatchRightRef.current.position.x, targetRight, 0.05);
    }
  });

  const getColor = () => {
    switch (state) {
      case 'idle': return '#e2e8f0'; 
      case 'hasParcel': return '#38bdf8'; 
      case 'active': return '#f59e0b'; 
      case 'delivered': return '#22c55e'; 
      default: return '#e2e8f0';
    }
  };

  return (
    <group position={position} rotation={rotation}>
      {/* Box Body: Extremely contrasting elegant glossy color compared to buildings */}
      <Box args={[1.5, 1, 1.5]} castShadow receiveShadow position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
      </Box>
      {/* Inner Cavity */}
      <Box args={[1.4, 0.9, 1.4]} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#000" />
      </Box>

      {/* Top Hatches: Bright vibrant rose red so it pops incredibly well! */}
      <group position={[0, 1.05, 0]}>
        <Box ref={hatchLeftRef} args={[0.7, 0.1, 1.5]} position={[-0.35, 0, 0]} castShadow>
          <meshStandardMaterial color="#e11d48" metalness={0.4} roughness={0.5} />
        </Box>
        <Box ref={hatchRightRef} args={[0.7, 0.1, 1.5]} position={[0.35, 0, 0]} castShadow>
          <meshStandardMaterial color="#e11d48" metalness={0.4} roughness={0.5} />
        </Box>
      </group>

      {/* LED Status Strip */}
      <mesh position={[0, 0.9, 0.76]}>
        <boxGeometry args={[1.2, 0.05, 0.05]} />
        <meshStandardMaterial 
          ref={ledRef}
          color={getColor()} 
          emissive={getColor()} 
          emissiveIntensity={2} 
          toneMapped={false} 
        />
      </mesh>
    </group>
  );
}
