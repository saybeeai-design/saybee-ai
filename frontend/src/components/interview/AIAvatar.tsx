/* eslint-disable */
'use client';

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

interface AIAvatarProps {
  isSpeaking: boolean;
}

function AvatarModel({ isSpeaking }: AIAvatarProps) {
  const group = useRef<THREE.Group>(null);
  
  // Load the GLB model from public/models/interviewer.glb
  const { scene, animations } = useGLTF('/models/interviewer.glb') as any;
  const { actions, mixer } = useAnimations(animations, group);

  // Fallback idle animation if the rig doesn't have built-in animations
  useFrame((state, delta) => {
    if (!group.current) return;

    // Suble idle floating/breathing
    const t = state.clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 2) * 0.02 - 1.5; // subtle vertical bob
    
    // Simulate speaking by adding subtle head nods and small unpredictable rotations
    if (isSpeaking) {
       group.current.rotation.y = Math.sin(t * 5) * 0.05;
       group.current.rotation.x = Math.sin(t * 3) * 0.02;
    } else {
       // Return to neutral when not speaking
       group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, 0.1);
       group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1);
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={[1.8, 1.8, 1.8]} position={[0, -1.5, 0]} />
    </group>
  );
}

export default function AIAvatar({ isSpeaking }: AIAvatarProps) {
  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <Canvas
        camera={{ position: [0, 0.5, 3], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
        />
        <pointLight position={[-5, 2, -5]} intensity={0.5} />
        
        <React.Suspense fallback={null}>
          <AvatarModel isSpeaking={isSpeaking} />
        </React.Suspense>
      </Canvas>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/interviewer.glb');
