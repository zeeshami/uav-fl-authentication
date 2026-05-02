import React from 'react';
import { Box } from '@react-three/drei';

export default function Building({ position, scale, color = "#2a3b52" }) {
  return (
    <group position={position}>
      {/* Core Concrete Structure */}
      <Box args={[scale[0], scale[1], scale[2]]} receiveShadow castShadow position={[0, scale[1]/2, 0]}>
        <meshStandardMaterial color={color} roughness={0.8} />
      </Box>
      
      {/* Glass facade - slightly wider to cover core */}
      <Box args={[scale[0] + 0.1, scale[1] - 0.5, scale[2] + 0.1]} position={[0, scale[1]/2, 0]}>
        <meshPhysicalMaterial 
          color="#38bdf8"
          transmission={0.8} 
          opacity={1} 
          metalness={0.7} 
          roughness={0.1}
          ior={1.5}
          thickness={0.5}
          transparent
        />
      </Box>
      
      {/* Rooftop Parapet */}
      <mesh position={[0, scale[1] + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[scale[0] - 0.2, 0.5, scale[2] - 0.2]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Landing Pad Marking */}
      <mesh position={[0, scale[1] + 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1, 1.3, 32]} />
        <meshBasicMaterial color="#38bdf8" side={2} />
      </mesh>
    </group>
  );
}
