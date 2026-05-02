import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSimStore, useAuthStore } from '../../store';
import Drone from './Drone';
import Parcel from './Parcel';

export default function HandoverMode() {
  const { isSimulationRunning, attackMode } = useSimStore();
  const { setCryptoScore, setAiScore, setWitnessScore, calculateTrust, trustLevel } = useAuthStore();
  
  const senderPos = [-8, 12, 0];
  const receiverPos = [8, 12, 0];
  const witnessPos = [0, 18, -6];

  const scanRingRef = useRef();

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Animate scanning ring
    if (scanRingRef.current) {
      scanRingRef.current.position.y = 12 + Math.sin(time * 2) * 2;
      scanRingRef.current.rotation.x = Math.PI / 2;
      scanRingRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
    }
    
    if (!isSimulationRunning) return;
    
    // Simulate Score processing
    const isEvil = attackMode !== 'none';
    
    // Update scores periodically
    if (Math.sin(time * 5) > 0.9) { 
      setCryptoScore(Math.min(100, Math.max(0, isEvil && attackMode==='spoofing' ? 30 : 90 + Math.random() * 10)));
      setAiScore(Math.min(100, Math.max(0, isEvil && attackMode==='abnormal' ? 25 : 85 + Math.random() * 15)));
      setWitnessScore(Math.min(100, Math.max(0, isEvil && attackMode==='rogue' ? 10 : 95 + Math.random() * 5)));
      calculateTrust();
    }
  });

  return (
    <group>
      {/* Minimalistic presentation ground */}
      <mesh receiveShadow position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#050a14" roughness={0.5} />
      </mesh>
      <gridHelper args={[150, 30, '#1e293b', '#0f172a']} position={[0, -0.4, 0]} />

      {/* Drones */}
      <Drone position={senderPos} type="local" state="hover" name="UAV-SENDER" colorOverride="#3b82f6" />
      <Drone position={receiverPos} type="local" state={attackMode === 'none' ? 'hover' : 'spoofing'} name={attackMode === 'spoofing' ? "UNKNOWN-ROUTER" : "UAV-RECEIVER"} colorOverride="#eab308" />
      <Drone position={witnessPos} type="witness" state="hover" name="UAV-WITNESS" colorOverride="#ef4444" />

      {/* Target Parcel attached to Sender */}
      <Parcel position={[-8, 11.4, 0]} />

      {/* Witness Scanning Effects */}
      <mesh ref={scanRingRef} position={[0, 12, 0]}>
        <ringGeometry args={[8, 8.2, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Visual links from witness to drones */}
      <Line start={witnessPos} end={senderPos} color="#f59e0b" opacity={0.3} />
      <Line start={witnessPos} end={receiverPos} color={attackMode === 'none' ? '#f59e0b' : '#ef4444'} opacity={0.3} />
      
      <PacketStream start={[-7, 12, 0]} end={[7, 12, 0]} active={isSimulationRunning} />
    </group>
  );
}

function Line({ start, end, color, opacity }) {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

function PacketStream({ start, end, active }) {
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (active && ref.current) {
      ref.current.children.forEach((child) => {
        child.position.x += 8 * delta; // speed
        if (child.position.x > end[0]) {
          child.position.x = start[0];
        }
      });
    }
  });

  return (
    <group ref={ref}>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} position={[start[0] + i * 3, start[1], start[2]]}>
          <boxGeometry args={[0.4, 0.05, 0.05]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      ))}
    </group>
  );
}
