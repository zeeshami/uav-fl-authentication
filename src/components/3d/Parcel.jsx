import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';

export default function Parcel({ position = [0, 0, 0] }) {
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta;
      ref.current.rotation.x += delta * 0.5;
    }
  });

  return (
    <group position={position}>
      <Box ref={ref} args={[0.6, 0.6, 0.6]} castShadow>
        <meshPhysicalMaterial 
          color="#38bdf8" 
          emissive="#38bdf8" 
          emissiveIntensity={0.8} 
          transmission={0.6} 
          roughness={0.2} 
        />
      </Box>
      <pointLight color="#38bdf8" intensity={2} distance={3} />
    </group>
  );
}
