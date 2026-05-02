import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Sky, Bvh } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useSimStore } from '../../store';

import LogisticsMode from './LogisticsMode';
import HandoverMode  from './HandoverMode';
import FLSwarmMode   from './FLSwarmMode';

export default function SimulationScene() {
  const mode = useSimStore((state) => state.mode);
  const camPos = mode === 'fl' ? [0, 28, 38] : [40, 30, 40];

  return (
    <Canvas shadows camera={{ position: camPos, fov: 45 }}>
      <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.3} />
      <ambientLight intensity={0.6} />
      <directionalLight castShadow position={[20, 30, 10]} intensity={1.5} shadow-mapSize={[2048, 2048]}>
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40]} />
      </directionalLight>

      <Bvh firstHitOnly>
        <Suspense fallback={null}>
          {mode === 'logistics' && <LogisticsMode />}
          {mode === 'handover'  && <HandoverMode />}
          {mode === 'fl'        && <FLSwarmMode />}
        </Suspense>
      </Bvh>

      <EffectComposer>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
      </EffectComposer>

      <CameraControls makeDefault />
    </Canvas>
  );
}
