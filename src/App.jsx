import React from 'react';
import { useSimStore } from './store';
import SimulationScene from './components/3d/SimulationScene';
import AppOverlay from './components/ui/AppOverlay';

function App() {
  const mode = useSimStore((state) => state.mode);

  return (
    <>
      <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <SimulationScene />
      </div>
      
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
        <AppOverlay />
      </div>
    </>
  );
}

export default App;
