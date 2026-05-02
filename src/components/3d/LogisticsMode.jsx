import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Drone from './Drone';
import CityEnvironment from './CityEnvironment';
import DeliveryBox from './DeliveryBox';
import Parcel from './Parcel';
import { useSimStore } from '../../store';

export default function LogisticsMode() {
  const { controls } = useThree();
  const { isSimulationRunning, playbackSpeed, setStepText, setParcelStatus, setShowTrustScore, isPaused } = useSimStore();
  
  const worldRef = useRef();
  const l1Ref = useRef();
  const h1Ref = useRef();
  const l2Ref = useRef();
  const w1Ref = useRef();
  const w2Ref = useRef();
  const parcel1Ref = useRef();
  
  const [currentPhase, setCurrentPhase] = useState(0); 
  const textRef = useRef("");
  const statusRef = useRef("");
  const trustRef = useRef(false);

  const startTimeRef = useRef(null);
  // Define default standby initialization explicit coords
  const currentCamPos = useRef(new THREE.Vector3(45, 100, 190));
  const currentTarget = useRef(new THREE.Vector3(45, 20, 0));

  const [h1Hatch, setH1Hatch] = useState(false);
  const [box1Hatch, setBox1Hatch] = useState(false);
  const [box1State, setBox1State] = useState('idle');
  const [box2Hatch, setBox2Hatch] = useState(false);
  const [box2State, setBox2State] = useState('idle');

  // Key Coordinates
  const box1Pos = new THREE.Vector3(-65, 14.5, -10);
  const hub1Pos = new THREE.Vector3(-65, 48, -10); 
  
  const hub2Pos = new THREE.Vector3(140, 48, -10);  // Adjusted Z natively linked to Transit vector
  const box2Pos = new THREE.Vector3(140, 12.5, 15);
  
  // High-altitude parking bases
  const l1Base = new THREE.Vector3(-65, 40, -10);
  const h1Start = new THREE.Vector3(-200, 75, -20);
  const w1Start = new THREE.Vector3(-55, 55, -25); 
  
  const l2Base = new THREE.Vector3(140, 40, 15);
  const w2Start = new THREE.Vector3(145, 55, -25); 

  useEffect(() => {if (controls) controls.setLookAt(45, 100, 190, 45, 20, 0, false);}, [controls]);

  useFrame((state, delta) => {
    let phase = 0; let uiText = ""; let uiStatus = ""; let showTrust = false;
    let desiredTargetLocal = new THREE.Vector3(); let camOffset = new THREE.Vector3();

    if (!isSimulationRunning) {
       startTimeRef.current = null;
       uiText = "Awaiting Order..."; uiStatus = "Standby";

       // Holds completely statically in wide view
       desiredTargetLocal.set(45, 20, 0);
       camOffset.set(0, 100, 190);

       if (box1Hatch) setBox1Hatch(false); 
       if (box2Hatch) setBox2Hatch(false); 
       if (h1Hatch) setH1Hatch(false);
       if (box1State !== 'idle') setBox1State('idle'); 
       if (box2State !== 'idle') setBox2State('idle');
       
       if (parcel1Ref.current) parcel1Ref.current.visible = false;
       if (worldRef.current) worldRef.current.position.x = 0;
       
       if (l1Ref.current) l1Ref.current.position.copy(l1Base);
       if (h1Ref.current) h1Ref.current.position.copy(h1Start);
       if (w1Ref.current) w1Ref.current.position.copy(w1Start);
       if (l2Ref.current) l2Ref.current.position.copy(l2Base);
       if (w2Ref.current) w2Ref.current.position.copy(w2Start);

    } else {
       if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime;
       
       if (isPaused && startTimeRef.current !== null) {
           startTimeRef.current += delta; // Directly suppresses clock progression natively creating a perfect Pause
       }

       const activeTime = state.clock.elapsedTime - startTimeRef.current;
       const speed = playbackSpeed * 0.6; 
       const t = (activeTime * speed) % 150; // Vastly expanded 150s timeline for slow, deliberate framing

       if (t < 2) {
           if (box1Hatch) setBox1Hatch(false); 
           if (box2Hatch) setBox2Hatch(false); 
           if (h1Hatch) setH1Hatch(false);
           if (box1State !== 'idle' && t < 1) setBox1State('idle'); 
           if (box2State !== 'idle') setBox2State('idle');
           if (parcel1Ref.current) parcel1Ref.current.visible = false;
           if (worldRef.current) worldRef.current.position.x = 0;
           
           if (l1Ref.current) l1Ref.current.position.copy(l1Base);
       }

       // -------------------------------------------------------------------------------------
       // FRAME 1: Camera slowly zooms to Zone A natively (t: 0 - 10)
       // -------------------------------------------------------------------------------------
       if (t >= 0 && t < 10) {
          phase = 1; uiText = "Step 1: Drone Delivery Initiated"; uiStatus = "Establishing Connection...";
          // Camera gently pushes sequentially down towards Box 1 utilizing purely natural interpolation speeds
          desiredTargetLocal.copy(box1Pos); 
          camOffset.set(30, 40, 80); 
          if (l1Ref.current) l1Ref.current.position.copy(l1Base); 
       }
       // -------------------------------------------------------------------------------------
       // FRAME 2: Drone Approaches softly and hovers above box (t: 10 - 15)
       // -------------------------------------------------------------------------------------
       else if (t >= 10 && t < 15) {
          phase = 2; uiText = "Step 1: Parcel Collection by Local Drone"; uiStatus = "Drone Approaching Hatch";
          desiredTargetLocal.copy(box1Pos); 
          camOffset.set(0, 15, 30); 
          // Beautifully slow continuous vertical dive from 40m sky down to 5m hover
          if (l1Ref.current) l1Ref.current.position.lerp(box1Pos.clone().add(new THREE.Vector3(0, 5, 0)), 1.5 * delta); 
       }
       // -------------------------------------------------------------------------------------
       // FRAME 3: Hatch Opens, Drone slowly extracts payload (t: 15 - 28)
       // -------------------------------------------------------------------------------------
       else if (t >= 15 && t < 28) {
          phase = 2; uiText = "Step 1: Parcel Collection by Local Drone"; uiStatus = "Extracting Parcel";
          desiredTargetLocal.copy(box1Pos); 
          camOffset.set(0, 8, 20); // Pin close on the extraction
          
          if (t > 15) { if (box1State !== 'active') setBox1State('active'); }
          if (t > 17) { if (!box1Hatch) setBox1Hatch(true); } 
          
          if (t > 19) {
             if (parcel1Ref.current) {
                 parcel1Ref.current.visible = true;
                 if (t < 23) parcel1Ref.current.position.copy(box1Pos); 
             }
          }

          if (t > 19 && t < 23) {
             // Slowly lower entirely inside the open hatch directly
             if (l1Ref.current) l1Ref.current.position.lerp(box1Pos.clone().add(new THREE.Vector3(0, 0.4, 0)), 1.5 * delta); 
          } else if (t >= 23) {
             // Drone delicately ascends out conveying cargo, halting 5m natively above hatch
             if (l1Ref.current) l1Ref.current.position.lerp(box1Pos.clone().add(new THREE.Vector3(0, 5, 0)), 1.0 * delta); 
             if (parcel1Ref.current) parcel1Ref.current.position.copy(l1Ref.current.position.clone().sub(new THREE.Vector3(0,0.4,0)));
          }
       }
       // -------------------------------------------------------------------------------------
       // FRAME 4: Hatch Closes natively, Drone holds, then sweeps upwards cleanly (t: 28 - 42)
       // -------------------------------------------------------------------------------------
       else if (t >= 28 && t < 42) {
          phase = 3; uiText = "Step 2: Securing Protocol & Ascending to Handover"; uiStatus = "Ascending with Cargo";
          
          if (box1Hatch) setBox1Hatch(false);
          if (box1State !== 'idle') setBox1State('idle'); 

          // Camera natively stays absolutely purely fixed watching hatch mechanics safely
          if (t < 32) {
             desiredTargetLocal.copy(box1Pos); 
             camOffset.set(0, 8, 20); 
             
             // Drone waits securely stationed 5m directly above closing hatch mechanics
             if (l1Ref.current) l1Ref.current.position.lerp(box1Pos.clone().add(new THREE.Vector3(0, 5, 0)), 5.0 * delta); 
             if (parcel1Ref.current && l1Ref.current) parcel1Ref.current.position.copy(l1Ref.current.position.clone().sub(new THREE.Vector3(0, 0.4, 0)));
          } 
          // Hatch is fully flushed away. Smoothly transition to sweep upwards!
          else {
             if (l1Ref.current) {
                desiredTargetLocal.copy(l1Ref.current.position); 
                camOffset.set(8, 8, 25);
                
                l1Ref.current.position.lerp(hub1Pos.clone().add(new THREE.Vector3(0, -1.2, 0)), 0.8 * delta); 
                if (parcel1Ref.current) parcel1Ref.current.position.copy(l1Ref.current.position.clone().sub(new THREE.Vector3(0, 0.4, 0)));
             }

             if (t > 34) {
                if (w1Ref.current) w1Ref.current.position.lerp(hub1Pos.clone().add(new THREE.Vector3(10, 5, -8)), 1.5 * delta);
             }
             if (t > 36) {
                if (h1Ref.current) h1Ref.current.position.lerp(hub1Pos, 2.0 * delta);
             }
          }
       }
       // -------------------------------------------------------------------------------------
       // FRAME 5: Secure Handover 1 (t: 42 - 58)
       // -------------------------------------------------------------------------------------
       else if (t >= 42 && t < 58) {
          phase = 4; uiText = "Step 3: Secure Handover in Presence of Witness Drone"; uiStatus = "Authenticating Handover..."; showTrust = true;
          
          desiredTargetLocal.copy(hub1Pos);
          camOffset.set(15, 5, 25); 

          if (t > 49 && t < 55) {
             uiStatus = "Transferring Cargo"; 
             if (!h1Hatch) setH1Hatch(true);
             // L1 physically nudges directly upwards securely docking package into heavy drone hatch
             if (l1Ref.current) l1Ref.current.position.lerp(hub1Pos.clone().add(new THREE.Vector3(0, -0.6, 0)), 2.0 * delta);

             if (parcel1Ref.current && h1Ref.current) parcel1Ref.current.position.lerp(h1Ref.current.position.clone().sub(new THREE.Vector3(0, 0.4, 0)), 1.5 * delta);
          }
          if (t >= 55) { if (h1Hatch) setH1Hatch(false); uiStatus = "Transfer Secured"; }
       }
       // -------------------------------------------------------------------------------------
       // FRAME 6: Transit Sequences (t: 58 - 85)
       // -------------------------------------------------------------------------------------
       else if (t >= 58 && t < 85) {
          phase = 5; uiText = "Step 4: Long Range Drone Transferring Parcel from Zone A to Zone B"; uiStatus = "In Transit";
          
          if (h1Ref.current) {
              desiredTargetLocal.copy(h1Ref.current.position); camOffset.set(-30, 20, 40);
          }
          
          if (l1Ref.current) l1Ref.current.position.lerp(l1Base, 1.5 * delta);
          if (w1Ref.current) w1Ref.current.position.lerp(w1Start, 1.5 * delta);
          
          const progress = Math.max(0, Math.min((t - 59) / 24, 1));
          const smoothProgress = progress * progress * (3 - 2 * progress);
          const currentWorldSlide = -205 * smoothProgress;
          if (worldRef.current) worldRef.current.position.x = currentWorldSlide;

          if (h1Ref.current) {
             h1Ref.current.position.set(hub1Pos.x - currentWorldSlide, hub1Pos.y, hub1Pos.z);
             if (parcel1Ref.current) parcel1Ref.current.position.copy(h1Ref.current.position.clone().sub(new THREE.Vector3(0,0.4,0)));
          }
       }
       // -------------------------------------------------------------------------------------
       // FRAME 7: Hub B Broadcast Operations (t: 85 - 100)
       // -------------------------------------------------------------------------------------
       else if (t >= 85 && t < 100) {
          phase = 6; uiText = "Step 5: Requesting Delivery Drone & Witness Confirmation"; uiStatus = "Broadcasting Hub Arrival";
          
          if (h1Ref.current) {
              desiredTargetLocal.copy(h1Ref.current.position); camOffset.set(-20, 10, 30);
          }

          if (t > 87) {
             if (w2Ref.current) w2Ref.current.position.lerp(hub2Pos.clone().add(new THREE.Vector3(-10, 5, -8)), 1.5 * delta);
          }
          if (t > 89) {
             if (l2Ref.current) l2Ref.current.position.lerp(hub2Pos.clone().add(new THREE.Vector3(0, -1.2, 0)), 1.5 * delta);
          }
       }
       // -------------------------------------------------------------------------------------
       // FRAME 8: Secure Handover 2 (t: 100 - 118)
       // -------------------------------------------------------------------------------------
       else if (t >= 100 && t < 118) {
          phase = 7; uiText = "Step 6: Secure Handover to Delivery Drone"; uiStatus = "Authenticating Drop-off..."; showTrust = true;
          
          desiredTargetLocal.copy(hub2Pos);
          camOffset.set(15, 5, 25); 

          if (t > 107 && t < 114) {
             if (!h1Hatch) setH1Hatch(true); uiStatus = "Releasing Cargo";
             // Delivery Drone explicitly ascends into the open hatch overhead to mechanically latch the payload natively
             if (l2Ref.current) l2Ref.current.position.lerp(hub2Pos.clone().add(new THREE.Vector3(0, -0.6, 0)), 3 * delta);

             if (parcel1Ref.current && l2Ref.current) parcel1Ref.current.position.lerp(l2Ref.current.position.clone().sub(new THREE.Vector3(0, 0.4, 0)), 1.5 * delta);
          }
          if (t >= 114) { if (h1Hatch) setH1Hatch(false); }
       }
       // -------------------------------------------------------------------------------------
       // FRAME 9: Naturalistic Hardware Box Insertion Sequences (t: 118 - 148)
       // -------------------------------------------------------------------------------------
       else if (t >= 118 && t < 148) {
          phase = 8; uiText = "Step 7: Delivery Drone Delivers Parcel to Destination"; uiStatus = "Final Approach";
          
          if (h1Ref.current) h1Ref.current.position.lerp(h1Start.clone().add(new THREE.Vector3(400, 0, 0)), 1.5 * delta); 
          if (w2Ref.current) w2Ref.current.position.lerp(w2Start, 1 * delta);

          if (l2Ref.current) {
             // ROCK SOLID CAMERA PIN. No drifting vectors. Kills 'moving buildings' parallax illusion natively.
             desiredTargetLocal.copy(box2Pos); 
             camOffset.set(0, 12, 25); 

             if (t < 125) {
                // Drone cleanly drops from high sky natively to 5m hovering hold above box
                uiStatus = "Final Approach";
                l2Ref.current.position.lerp(box2Pos.clone().add(new THREE.Vector3(0, 5, 0)), 1.5 * delta);
                if (parcel1Ref.current) parcel1Ref.current.position.copy(l2Ref.current.position.clone().sub(new THREE.Vector3(0,0.4,0)));
             } 
             else if (t >= 125 && t < 129) {
                // Hold firmly 5m above! Hatch mathematically opens
                uiStatus = "Opening Secure Hatch";
                if (box2State !== 'active') setBox2State('active'); 
                if (!box2Hatch) setBox2Hatch(true);
                l2Ref.current.position.lerp(box2Pos.clone().add(new THREE.Vector3(0, 5, 0)), 5.0 * delta); 
             } 
             else if (t >= 129 && t < 133) {
                // Descend precisely directly into the geometrically open shaft physically conveying the parcel
                uiStatus = "Depositing into Delivery Box";
                l2Ref.current.position.lerp(box2Pos.clone().add(new THREE.Vector3(0, 0.4, 0)), 1.5 * delta);
                if (parcel1Ref.current) parcel1Ref.current.position.copy(l2Ref.current.position.clone().sub(new THREE.Vector3(0,0.4,0)));
             } 
             else if (t >= 133 && t < 137) {
                // Deliver completed. Drone sweeps out of shaft and hovers strictly physically above 5m while doors wait.
                uiStatus = "Delivery Complete";
                if (box2State !== 'delivered') setBox2State('delivered'); 
                l2Ref.current.position.lerp(box2Pos.clone().add(new THREE.Vector3(0, 5, 0)), 1.5 * delta);
                if (parcel1Ref.current) parcel1Ref.current.position.lerp(box2Pos, 3 * delta); 
             } 
             else if (t >= 137 && t < 141) {
                // Hover completely safely statically natively checking doors mechanically sliding closed gracefully.
                uiStatus = "Securing Delivery Box";
                if (box2Hatch) setBox2Hatch(false);
                l2Ref.current.position.lerp(box2Pos.clone().add(new THREE.Vector3(0, 5, 0)), 5.0 * delta); 
             } 
             else {
                // Geometrics cleanly terminated. Final smooth escape ascent completely out of frame natively.
                uiStatus = "Returning to Base";
                l2Ref.current.position.lerp(l2Base, 1.5 * delta);
             }
          }
       }
    }

    let desiredTarget = desiredTargetLocal.clone();
    if (worldRef.current) desiredTarget.add(worldRef.current.position); 
    let desiredCamPos = desiredTarget.clone().add(camOffset); 
    
    if (controls) {
       // Universally smooth, highly controlled continuous geometric easing natively matching user request
       const lerpForce = 1.5 * delta;

       currentCamPos.current.lerp(desiredCamPos, lerpForce);
       currentTarget.current.lerp(desiredTarget, 2.5 * delta); // slightly faster targeting maintains lock over drift
       
       controls.setLookAt(
           currentCamPos.current.x, currentCamPos.current.y, currentCamPos.current.z,
           currentTarget.current.x, currentTarget.current.y, currentTarget.current.z,
           false
       );
    }

    if (uiText !== textRef.current) { textRef.current = uiText; setStepText(uiText); }
    if (uiStatus !== statusRef.current) { statusRef.current = uiStatus; setParcelStatus(uiStatus); }
    if (showTrust !== trustRef.current) { trustRef.current = showTrust; setShowTrustScore(showTrust); }
    if (phase !== currentPhase) { setCurrentPhase(phase); }
  });

  return (
    <group ref={worldRef}>
      <CityEnvironment />
      
      <DeliveryBox position={box1Pos.toArray()} state={box1State} hatchOpen={box1Hatch} />
      <DeliveryBox position={box2Pos.toArray()} state={box2State} hatchOpen={box2Hatch} rotation={[0, Math.PI, 0]} />

      <group ref={l1Ref} position={l1Base.toArray()}>
         <Drone type="local" state={currentPhase === 4 ? 'transfer' : 'idle'} name="Local Drone" active={currentPhase >= 1 && currentPhase <= 4} />
      </group>
      
      <group ref={h1Ref} position={h1Start.toArray()}>
         <Drone type="long-range" state={(currentPhase === 4 || currentPhase === 7) ? 'transfer' : 'idle'} hatchOpen={h1Hatch} name="Long Range Drone" active={currentPhase >= 3 && currentPhase <= 7} />
      </group>
      
      <group ref={l2Ref} position={l2Base.toArray()}>
         <Drone type="local" state={currentPhase === 7 ? 'transfer' : 'idle'} name="Local Drone" active={currentPhase >= 6 && currentPhase <= 8} />
      </group>
      
      <group ref={w1Ref} position={w1Start.toArray()}>
         <Drone type="witness" state={currentPhase === 4 ? 'transfer' : 'idle'} name="Witness Drone" active={currentPhase === 3 || currentPhase === 4} />
      </group>
      
      <group ref={w2Ref} position={w2Start.toArray()}>
         <Drone type="witness" state={currentPhase === 7 ? 'transfer' : 'idle'} name="Witness Drone" active={currentPhase === 6 || currentPhase === 7} />
      </group>
      
      <group ref={parcel1Ref} position={box1Pos.toArray()}>
         <Parcel />
      </group>

      <mesh position={hub1Pos.clone().setY(29.8).toArray()} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[6, 6.2, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={hub2Pos.clone().setY(29.8).toArray()} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[6, 6.2, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
