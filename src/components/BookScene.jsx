import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Book from './Book';

export default function BookScene({ currentPage, setCurrentPage, started, freeReading, setFreeReading, onReady }) {
  return (
    <div className="w-full h-full relative outline-none select-none">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 9], fov: 45 }}
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          shadowMapType: THREE.PCFShadowMap
        }}
      >


        {/* Ambient light for subtle environmental fill */}
        <ambientLight intensity={0.65} />

        {/* 
          Strategic Directional Light to create the "glossy highlight" along the curve of the paper.
          Placed at a high-side angle to hit the curve of the page, casting crisp but soft shadows.
        */}
        <directionalLight
          position={[6, 8, 5]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={20}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0001}
        />

        {/* 
          Additional soft point light to give a warm glow to the center spine 
          and illuminate the pop-ups from below.
        */}
        <pointLight position={[0, -1, 3]} intensity={0.5} color="#ffd8a8" />

        {/* 
          Environment map preset for high-fidelity reflections.
          This will reflect off the low roughness mesh standard material of the pages,
          giving the paper a premium, sheen appearance.
        */}
        <Environment preset="studio" intensity={0.6} />

        {/* The 3D Book coordinate group */}
        <group position={[0, -0.4, 0]}>
          <React.Suspense fallback={null}>
            <Book 
              currentPage={currentPage} 
              setCurrentPage={setCurrentPage} 
              started={started} 
              freeReading={freeReading}
              setFreeReading={setFreeReading}
              onReady={onReady}
            />
          </React.Suspense>
        </group>

        {/* Soft ground contact shadows beneath the book */}
        <ContactShadows
          position={[0, -2.4, 0]}
          opacity={0.6}
          scale={15}
          blur={2.4}
          far={4.5}
        />

        {/* Orbit Controls for interactive rotation */}
        <OrbitControls
          enableZoom={true}
          enableRotate={false}
          maxPolarAngle={Math.PI / 1.7} // Don't allow going too far under the table
          minPolarAngle={Math.PI / 6}   // Don't allow looking straight down
          minDistance={5}
          maxDistance={15}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
