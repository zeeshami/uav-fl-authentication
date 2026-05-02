import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';

export default function Drone({ position = [0, 0, 0], type = 'local', state = 'idle', rotation = [0, 0, 0], hatchOpen = false, name = "", active = false }) {
  const groupRef = useRef();
  const rotorsRef = useRef();
  const bellyHatchLeft = useRef();
  const bellyHatchRight = useRef();

  useFrame((stateObj, delta) => {
    if ((state === 'hover' || state === 'idle') && groupRef.current) {
      const time = stateObj.clock.elapsedTime;
      groupRef.current.position.y += Math.sin(time * 3 + position[0]) * 0.003;
      groupRef.current.rotation.z = Math.sin(time * 2) * 0.05;
      groupRef.current.rotation.x = Math.cos(time * 2.5) * 0.05;
    }
    if (rotorsRef.current) {
      rotorsRef.current.rotation.y += delta * 25; 
    }
    if (type === 'long-range' && bellyHatchLeft.current && bellyHatchRight.current) {
      const targetL = hatchOpen ? -0.8 : -0.375;
      const targetR = hatchOpen ? 0.8 : 0.375;
      bellyHatchLeft.current.position.x = THREE.MathUtils.lerp(bellyHatchLeft.current.position.x, targetL, 0.05);
      bellyHatchRight.current.position.x = THREE.MathUtils.lerp(bellyHatchRight.current.position.x, targetR, 0.05);
    }
  });

  const isEvil = state === 'rogue' || state === 'spoofing';
  
  let bodyColor, accentColor;
  if (type === 'local') {
     bodyColor = '#06b6d4'; accentColor = '#0ea5e9'; // Blue / Cyan
  } else if (type === 'long-range') {
     bodyColor = '#334155'; accentColor = '#9333ea'; // Dark Grey / Metallic Purple
  } else if (type === 'witness') {
     bodyColor = '#eab308'; accentColor = '#ea580c'; // Yellow / Orange
  }

  if (isEvil) {
    accentColor = '#ef4444'; 
    bodyColor = '#b91c1c'; // Malicious Red
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      
      {name && (
        <Html position={[0, type === 'long-range' ? 1.5 : 0.8, 0]} center zIndexRange={[100, 0]}>
          <div style={{
            background: active ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.4)',
            border: active ? `2px solid ${accentColor}` : `1px solid #475569`,
            padding: active ? '6px 12px' : '4px 8px',
            borderRadius: '6px',
            color: active ? '#fff' : '#94a3b8',
            fontSize: active ? '13px' : '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            letterSpacing: '1px',
            boxShadow: active ? `0 0 20px ${accentColor}88` : 'none',
            transition: 'all 0.4s ease',
            pointerEvents: 'none',
            opacity: active ? 1 : 0.4
          }}>
            {name}
          </div>
        </Html>
      )}

      {/* ---------------- LOCAL DRONE ---------------- */}
      {type === 'local' && (
        <group scale={[0.45, 0.45, 0.45]}>
          <Cylinder args={[0.6, 0.6, 0.3, 16]} castShadow position={[0,0,0]}>
            <meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.5} emissive={bodyColor} emissiveIntensity={0.2} toneMapped={false} />
          </Cylinder>
          <Box args={[2.6, 0.15, 0.35]} position={[0, 0, 0]} rotation={[0, Math.PI/4, 0]} castShadow>
            <meshStandardMaterial color={bodyColor} metalness={0.2} />
          </Box>
          <Box args={[2.6, 0.15, 0.35]} position={[0, 0, 0]} rotation={[0, -Math.PI/4, 0]} castShadow>
            <meshStandardMaterial color={bodyColor} metalness={0.2} />
          </Box>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={2} toneMapped={false} />
          </mesh>
          <group ref={rotorsRef}>
            <Rotor position={[1, 0.15, 1]} size={1.2} />
            <Rotor position={[-1, 0.15, -1]} size={1.2} />
            <Rotor position={[1, 0.15, -1]} size={1.2} />
            <Rotor position={[-1, 0.15, 1]} size={1.2} />
          </group>
          <Cylinder args={[0.05, 0.05, 0.4, 8]} position={[0, -0.35, 0]}>
             <meshStandardMaterial color="#334155" />
          </Cylinder>
        </group>
      )}

      {/* ---------------- LONG-RANGE DRONE ---------------- */}
      {type === 'long-range' && (
        <group scale={[0.85, 0.85, 0.85]}>
          <Box args={[1.5, 0.8, 3]} castShadow>
            <meshStandardMaterial color={bodyColor} metalness={0.5} roughness={0.4} />
          </Box>
          <Box args={[3.2, 0.15, 2.5]} position={[0, 0.3, 0]} castShadow>
            <meshStandardMaterial color={accentColor} metalness={0.8} />
          </Box>
          <Box args={[1.4, 0.4, 0.4]} position={[0, 0, 1.5]} castShadow>
            <meshStandardMaterial color="#0f172a" />
          </Box>
          <mesh position={[0, 0.45, 1.2]}>
            <boxGeometry args={[0.8, 0.05, 0.1]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={1.5} toneMapped={false} />
          </mesh>
          {/* Explicit Cargo Box / Delivery Container */}
          <group position={[0, -0.6, 0]}>
            <Box args={[1.5, 0.8, 1.5]} castShadow>
              <meshStandardMaterial color="#1e293b" />
            </Box>
            {/* Bright contrasting cargo hatches */}
            <Box ref={bellyHatchLeft} args={[0.75, 0.05, 1.5]} position={[-0.375, -0.4, 0]} castShadow>
              <meshStandardMaterial color="#f97316" metalness={0.4} />
            </Box>
            <Box ref={bellyHatchRight} args={[0.75, 0.05, 1.5]} position={[0.375, -0.4, 0]} castShadow>
              <meshStandardMaterial color="#f97316" metalness={0.4} />
            </Box>
          </group>
          <group ref={rotorsRef}>
            <Rotor position={[1.5, 0.4, 1.2]} size={1.2} />
            <Rotor position={[-1.5, 0.4, 1.2]} size={1.2} />
            <Rotor position={[1.5, 0.4, -1.2]} size={1.2} />
            <Rotor position={[-1.5, 0.4, -1.2]} size={1.2} />
            <Rotor position={[1.5, 0.4, 0]} size={1.2} />
            <Rotor position={[-1.5, 0.4, 0]} size={1.2} />
          </group>
        </group>
      )}

      {/* ---------------- WITNESS DRONE ---------------- */}
      {type === 'witness' && (
        <group scale={[0.6, 0.6, 0.6]}>
          <Sphere args={[0.7, 32, 16]} castShadow scale={[1, 0.5, 1]} position={[0, 0.2, 0]}>
            <meshStandardMaterial color={bodyColor} metalness={0.2} roughness={0.3} emissive={bodyColor} emissiveIntensity={0.2} toneMapped={false} />
          </Sphere>
          <Cylinder args={[0.7, 0.6, 0.4, 32]} castShadow position={[0, 0, 0]}>
            <meshStandardMaterial color={bodyColor} metalness={0.2} />
          </Cylinder>
          <group position={[0, -0.1, 0.6]}>
            <Cylinder args={[0.3, 0.3, 0.2, 16]} rotation={[Math.PI/2, 0, 0]} castShadow>
              <meshStandardMaterial color="#0f172a" />
            </Cylinder>
            <mesh position={[0, 0, 0.11]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={3} toneMapped={false} />
            </mesh>
          </group>
          <group ref={rotorsRef}>
            <Rotor position={[1, 0.1, 0]} size={0.8} />
            <Rotor position={[-1, 0.1, 0]} size={0.8} />
            <Rotor position={[0, 0.1, -1]} size={0.8} />
            <Rotor position={[0, 0.1, 1]} size={0.8} />
          </group>
        </group>
      )}
    </group>
  );
}

function Rotor({ position, size = 1 }) {
  return (
    <group position={position}>
      <Cylinder args={[0.05, 0.05, 0.1, 8]} position={[0, 0, 0]}>
         <meshStandardMaterial color="#475569" />
      </Cylinder>
      <Box args={[size, 0.02, 0.1]} position={[0, 0.05, 0]}>
         <meshStandardMaterial color="#0f172a" />
      </Box>
      <Box args={[0.1, 0.02, size]} position={[0, 0.05, 0]}>
         <meshStandardMaterial color="#0f172a" />
      </Box>
    </group>
  );
}
