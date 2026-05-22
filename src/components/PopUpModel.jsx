import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------
// 1. React Error Boundary for catching GLTF load failures
// ---------------------------------------------------------
class GLTFErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("GLTF Model load failed, rendering procedural fallback instead.", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------
// 2. GLTF Loader Component
// ---------------------------------------------------------
function GltfLoader({ path, customScale = 1.0 }) {
  const { scene } = useGLTF(path);

  const normalizedScene = React.useMemo(() => {
    const clone = scene.clone();

    // Compute bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Normalize scale: make height (size.y) or max dimension equal to 1.8 units
    const targetHeight = 1.8 * customScale;
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = targetHeight / (maxDim || 1);
    
    clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Center horizontally and align bottom of bounding box to Y = 0
    clone.position.x = -center.x * scaleFactor;
    clone.position.y = -box.min.y * scaleFactor;
    clone.position.z = -center.z * scaleFactor;

    return clone;
  }, [scene, customScale]);

  useEffect(() => {
    normalizedScene.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }, [normalizedScene]);

  return <primitive object={normalizedScene} />;
}

// ---------------------------------------------------------
// 3. Main PopUpModel Component
// ---------------------------------------------------------
export default function PopUpModel({ active, type, modelPath, customScale = 1.0, preloadDelay }) {
  const groupRef = useRef();
  const [shouldLoad, setShouldLoad] = useState(false);
  const [delayedActive, setDelayedActive] = useState(false);

  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Trigger loading only when this model becomes active for the first time
  // Also delay the scaling animation by 600ms so it appears after the page flips open
  useEffect(() => {
    if (isMobile) return;
    if (active) {
      setShouldLoad(true);
      const timer = setTimeout(() => {
        setDelayedActive(true);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      setDelayedActive(false);
    }
  }, [active, isMobile]);

  // Staggered background preloading to upload model to GPU in the background (Disabled on mobile to save RAM)
  useEffect(() => {
    if (isMobile) return; // Do not preload on mobile devices
    if (preloadDelay) {
      const timer = setTimeout(() => {
        setShouldLoad(true);
      }, preloadDelay);
      return () => clearTimeout(timer);
    }
  }, [preloadDelay, isMobile]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetScale = delayedActive ? 1.0 : 0;
      // Position the model's Y base slightly above the spine crease of the book
      const targetY = delayedActive ? 1.5 : -0.5;

      // Mượt mà thu phóng khi mở/đóng sách
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, delta * 5)
      );

      // Mượt mà trồi lên/hạ xuống
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        targetY,
        delta * 5
      );

      // --- SỬA Ở ĐÂY: KHÔI PHỤC TÍNH NĂNG TỰ ĐỘNG XOAY ---
      if (delayedActive) {
        groupRef.current.rotation.y += delta * 0.8;
      }
    }
  });

  const fallback = null;

  if (isMobile) {
    return null;
  }

  return (
    <group ref={groupRef} scale={0} position={[0, 0, 0]}>
      {shouldLoad ? (
        <GLTFErrorBoundary fallback={fallback}>
          {modelPath ? (
            <React.Suspense fallback={fallback}>
              <GltfLoader path={modelPath} customScale={customScale} />
            </React.Suspense>
          ) : (
            fallback
          )}
        </GLTFErrorBoundary>
      ) : null}
    </group>
  );
}