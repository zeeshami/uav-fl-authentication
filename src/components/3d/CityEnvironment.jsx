import React from 'react';
import { Box, Plane, Html } from '@react-three/drei';

export default function CityEnvironment() {
  
  // Distribute buildings randomly but systematically to create 2 distinct zones.
  const createBuildings = (zone, count, startX, width) => {
    return Array.from({ length: count }).map((_, i) => {
      const height = 15 + Math.random() * 25;
      const x = startX + Math.random() * width - (width / 2);
      const z = -25 - Math.random() * 30; // Strictly constrained to deep background space so camera is never blocked
      
      // Theme colors for Zones
      let bodyColor, roofColor;
      if (zone === 1) {
         bodyColor = '#f8fafc'; // Crisp bright white
         roofColor = '#bae6fd'; // Light blue roofs
      } else {
         bodyColor = '#fdf4ff'; // Crisp warm white
         roofColor = '#86efac'; // Light green roofs
      }

      return (
        <group key={`${zone}-${i}`} position={[x, height / 2, z]}>
          <Box args={[12, height, 12]} castShadow receiveShadow>
            <meshStandardMaterial color={bodyColor} roughness={0.8} metalness={0.1} />
          </Box>
          <Box args={[12.2, 0.5, 12.2]} position={[0, height / 2 + 0.25, 0]} castShadow receiveShadow>
            <meshStandardMaterial color={roofColor} roughness={0.5} />
          </Box>
        </group>
      );
    });
  };

  return (
    <group>
      {/* Dynamic 3D City Labels */}
      <Html position={[-40, 10, 0]} center zIndexRange={[100, 0]}>
         <div style={{
            background: 'rgba(2,132,199,0.9)', color: '#fff', fontSize: '20px', fontWeight: 'bold', 
            padding: '10px 20px', borderRadius: '12px', border: '3px solid #7dd3fc', 
            boxShadow: '0 10px 30px rgba(2,132,199,0.8)', letterSpacing: '2px', pointerEvents: 'none', transform: 'scale(0.8)'
         }}>
            ZONE A: SECURE MANUFACTURING
         </div>
      </Html>

      <Html position={[130, 10, 0]} center zIndexRange={[100, 0]}>
         <div style={{
            background: 'rgba(22,163,74,0.9)', color: '#fff', fontSize: '20px', fontWeight: 'bold', 
            padding: '10px 20px', borderRadius: '12px', border: '3px solid #86efac', 
            boxShadow: '0 10px 30px rgba(22,163,74,0.8)', letterSpacing: '2px', pointerEvents: 'none', transform: 'scale(0.8)'
         }}>
            ZONE B: COMMERCIAL DISTRICT
         </div>
      </Html>

      {/* Buildings */}
      {createBuildings(1, 4, -40, 50)}
      {createBuildings(2, 6, 120, 60)}
      
      {/* Custom target buildings for the logistics start/end specifically */}
      <group position={[-65, 7, -10]}>
          <Box args={[14, 14, 14]} castShadow receiveShadow>
             <meshStandardMaterial color="#f0f9ff" roughness={0.8} metalness={0.1} /> {/* Zone 1 blue tint */}
          </Box>
          <Box args={[14.2, 0.5, 14.2]} position={[0, 7.25, 0]} castShadow receiveShadow>
             <meshStandardMaterial color="#38bdf8" roughness={0.5} /> 
          </Box>
      </group>

      <group position={[140, 6, 15]}>
          <Box args={[14, 12, 14]} castShadow receiveShadow>
             <meshStandardMaterial color="#f0fdf4" roughness={0.8} metalness={0.1} /> {/* Zone 2 green tint */}
          </Box>
          <Box args={[14.2, 0.5, 14.2]} position={[0, 6.25, 0]} castShadow receiveShadow>
             <meshStandardMaterial color="#22c55e" roughness={0.5} /> 
          </Box>
      </group>

      {/* Modern Bright Grid Ground */}
      <Plane args={[1000, 1000]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.8} />
      </Plane>
      <gridHelper args={[1000, 200, '#e2e8f0', '#94a3b8']} position={[0, 0, 0]} />

      {/* Central High-speed Transit Highway */}
      <Plane args={[1000, 20]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 10]} receiveShadow>
        <meshStandardMaterial color="#e4e4e7" metalness={0.2} roughness={0.4} />
      </Plane>
      <Plane args={[1000, 0.5]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 10]}>
        <meshBasicMaterial color="#38bdf8" />
      </Plane>
    </group>
  );
}
