import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import Page from './Page';
import PopUpModel from './PopUpModel';

export default function Book({ currentPage, setCurrentPage, started, freeReading, setFreeReading, onReady }) {
  const mainGroupRef = useRef();
  const bookRotationRef = useRef();
  const { gl } = useThree();

  // Call onReady when the Book component is successfully mounted and rendered
  useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  // Drag states for rotating the book
  const isDragging = useRef(false);
  const hasDragged = useRef(false); // Flag to differentiate drag from simple click
  const dragStart = useRef({ x: 0, y: 0 });
  const bookRotation = useRef({ x: -Math.PI / 6, y: -Math.PI / 18 });
  const targetRotation = useRef({ x: -Math.PI / 6, y: -Math.PI / 18 });
  const firstPageRender = useRef(true);
  const scaleVelocity = useRef(0);

  // States for cycling model sub-indices (every 5 seconds)
  const [subModelIdx3, setSubModelIdx3] = useState(0);
  const [subModelIdx4, setSubModelIdx4] = useState(0);

  // Timer for Page 3 multiple 3D models (rotate every 5 seconds)
  useEffect(() => {
    if (currentPage !== 3) {
      setSubModelIdx3(0);
      return;
    }
    const interval = setInterval(() => {
      setSubModelIdx3((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentPage]);

  // Timer for Page 4 multiple 3D models (rotate every 5 seconds)
  useEffect(() => {
    if (currentPage !== 4) {
      setSubModelIdx4(0);
      return;
    }
    const interval = setInterval(() => {
      setSubModelIdx4((prev) => (prev + 1) % 2);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentPage]);

  // Sequential Background Preloader for 3D GLTF models
  useEffect(() => {
    const modelsToPreload = [
      '/models/trang1.glb',
      '/models/trang2.glb',
      '/models/trang3.1.glb',
      '/models/trang3.2.glb',
      '/models/trang3.3.glb',
      '/models/trang4.1.glb',
      '/models/trang4.2.glb',
      '/models/trang5.glb',
      '/models/trang6.glb',
      '/models/trang7.glb'
    ];

    let isComponentMounted = true;

    async function loadModelsSequentially() {
      // Delay 1 second after mount to let the landing page render smoothly first
      await new Promise((resolve) => setTimeout(resolve, 1000));

      for (const path of modelsToPreload) {
        if (!isComponentMounted) break;
        try {
          // Preload and parse GLTF into memory cache sequentially
          useGLTF.preload(path);
        } catch (err) {
          console.warn(`[BackgroundPreloader] Failed to preload GLTF ${path}`, err);
        }
        // Delay 1.5 seconds between loads to prevent freezing/lag
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    loadModelsSequentially();

    return () => {
      isComponentMounted = false;
    };
  }, []);

  // Play the last 0.7s of the page flip sound on page change
  useEffect(() => {
    if (firstPageRender.current) {
      firstPageRender.current = false;
      return;
    }
    if (started) {
      const audio = new Audio('/sounds/Audio.mp3');
      audio.volume = 0.5;

      const playLastSegment = () => {
        const duration = audio.duration;
        if (duration) {
          audio.currentTime = Math.max(0, duration - 0.7);
          audio.play().catch((e) => console.log('Audio play blocked:', e));
        }
      };

      if (audio.readyState >= 1) {
        playLastSegment();
      } else {
        audio.addEventListener('loadedmetadata', playLastSegment);
      }

      return () => {
        audio.removeEventListener('loadedmetadata', playLastSegment);
        audio.pause();
      };
    }
  }, [currentPage, started]);

  // 1. LOAD IMAGES
  const texBia = useTexture('/textures/bia.png');
  const texBiaCuoi = useTexture('/textures/biacuoi.png');
  const texTrang1Left = useTexture('/textures/trang1left.png');
  const texTrang1Right = useTexture('/textures/trang1right.png');
  const texTrang2Left = useTexture('/textures/trang2left.png');
  const texTrang2Right = useTexture('/textures/trang2right.png');
  const texTrang3Left = useTexture('/textures/trang3left.png');
  const texTrang3Right = useTexture('/textures/trang3right.png');
  const texTrang4Left = useTexture('/textures/trang4left.png');
  const texTrang4Right = useTexture('/textures/trang4right.png');
  const texTrang5Left = useTexture('/textures/trang5left.png');
  const texTrang5Right = useTexture('/textures/trang5right.png');
  const texTrang6Left = useTexture('/textures/trang6left.png');
  const texTrang6Right = useTexture('/textures/trang6right.png');
  const texTrang7Left = useTexture('/textures/trang7left.png');
  const texTrang7Right = useTexture('/textures/trang7right.png');

  // 2. TEXTURE BASIC CONFIGURATION
  useEffect(() => {
    const allTextures = [
      texBia, texBiaCuoi,
      texTrang1Left, texTrang1Right,
      texTrang2Left, texTrang2Right,
      texTrang3Left, texTrang3Right,
      texTrang4Left, texTrang4Right,
      texTrang5Left, texTrang5Right,
      texTrang6Left, texTrang6Right,
      texTrang7Left, texTrang7Right
    ];
    allTextures.forEach((tex) => {
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        tex.needsUpdate = true;
      }
    });
  }, [
    texBia, texBiaCuoi,
    texTrang1Left, texTrang1Right,
    texTrang2Left, texTrang2Right,
    texTrang3Left, texTrang3Right,
    texTrang4Left, texTrang4Right,
    texTrang5Left, texTrang5Right,
    texTrang6Left, texTrang6Right,
    texTrang7Left, texTrang7Right
  ]);

  // 3. CANVAS BAKING: PAGE NUMBERING & LEFT-PAGE MIRROR CORRECTOR
  const textures = useMemo(() => {
    const bakePageNumber = (texture, number, isLeft) => {
      if (!texture || !texture.image) return texture;

      const canvas = document.createElement('canvas');
      canvas.width = texture.image.width || 1024;
      canvas.height = texture.image.height || 1480;

      const ctx = canvas.getContext('2d');
      if (isLeft) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);



      const newTex = new THREE.CanvasTexture(canvas);
      newTex.colorSpace = THREE.SRGBColorSpace;
      newTex.anisotropy = 16;
      newTex.needsUpdate = true;
      return newTex;
    };

    return [
      texBia,                                     // Leaf 0 Front
      bakePageNumber(texTrang1Left, 1, true),     // Leaf 0 Back
      bakePageNumber(texTrang1Right, 2, false),   // Leaf 1 Front
      bakePageNumber(texTrang2Left, 3, true),     // Leaf 1 Back
      bakePageNumber(texTrang2Right, 4, false),   // Leaf 2 Front
      bakePageNumber(texTrang3Left, 5, true),     // Leaf 2 Back
      bakePageNumber(texTrang3Right, 6, false),   // Leaf 3 Front
      bakePageNumber(texTrang4Left, 7, true),     // Leaf 3 Back
      bakePageNumber(texTrang4Right, 8, false),   // Leaf 4 Front
      bakePageNumber(texTrang5Left, 9, true),     // Leaf 4 Back
      bakePageNumber(texTrang5Right, 10, false),  // Leaf 5 Front
      bakePageNumber(texTrang6Left, 11, true),    // Leaf 5 Back
      bakePageNumber(texTrang6Right, 12, false),  // Leaf 6 Front
      bakePageNumber(texTrang7Left, 13, true),    // Leaf 6 Back
      bakePageNumber(texTrang7Right, 14, false),  // Leaf 7 Front
      bakePageNumber(texBiaCuoi, null, true)      // Leaf 7 Back
    ];
  }, [
    texBia, texBiaCuoi,
    texTrang1Left, texTrang1Right,
    texTrang2Left, texTrang2Right,
    texTrang3Left, texTrang3Right,
    texTrang4Left, texTrang4Right,
    texTrang5Left, texTrang5Right,
    texTrang6Left, texTrang6Right,
    texTrang7Left, texTrang7Right
  ]);

  // 4. LISTENERS TO DRAG ROTATE THE BOOK
  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerDown = (e) => {
      if (e.button !== 0) return; // Only trigger dragging with left-click
      isDragging.current = true;
      hasDragged.current = false; // Reset drag flag on pointer down
      dragStart.current = { x: e.clientX, y: e.clientY };
      bookRotation.current = { ...targetRotation.current };
    };

    const handlePointerMove = (e) => {
      if (!isDragging.current) return;

      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If the drag distance is greater than 15px, mark as dragging (prevents click event)
      if (distance > 15) {
        hasDragged.current = true;
      }

      const sensitivity = 0.005;

      // Update targeted rotations based on movement delta
      targetRotation.current.y = bookRotation.current.y + deltaX * sensitivity;
      targetRotation.current.x = bookRotation.current.x + deltaY * sensitivity;

      if (!freeReading) {
        // Clamp pitch: expand vertical rotation range to between -Math.PI / 3.0 and -Math.PI / 10.0
        targetRotation.current.x = Math.max(-Math.PI / 3.0, Math.min(-Math.PI / 10.0, targetRotation.current.x));

        // Clamp yaw: restrict rotation range to prevent excessive horizontal spinning
        targetRotation.current.y = Math.max(-Math.PI / 6, Math.min(Math.PI / 18, targetRotation.current.y));
      } else {
        // Free rotation: wide pitch clamp (prevent upside-down flipping) and no yaw clamp
        targetRotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotation.current.x));
      }
    };

    const handlePointerUp = () => {
      // If it was a clean click (no drag) on the canvas while on the back cover, transition instantly
      if (isDragging.current && !hasDragged.current) {
        if (!freeReading && currentPage === 8) {
          setFreeReading(true);
          setCurrentPage(0);
        }
      }
      // Delay resetting isDragging slightly so onClick can read hasDragged flag
      setTimeout(() => {
        isDragging.current = false;
      }, 50);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, freeReading, currentPage]);

  // Reset book rotation to default when returning to closed/intro state or changing mode
  useEffect(() => {
    if (freeReading) {
      if (mainGroupRef.current) {
        mainGroupRef.current.scale.set(0.2, 0.2, 0.2);
      }
    }
    targetRotation.current = { x: -Math.PI / 6, y: -Math.PI / 18 };
    bookRotation.current = { x: -Math.PI / 6, y: -Math.PI / 18 };
  }, [started, freeReading]);

  const width = 3.6;
  const height = 5.2;

  useFrame((state, delta) => {
    if (mainGroupRef.current && bookRotationRef.current) {
      const isMobile = state.size.width < 768;
      const targetX = 0;
      let targetY = started ? 0 : (isMobile ? -0.8 : -1.2);
      let targetZ = started ? 0 : (isMobile ? -0.8 : -1.0);
      
      let targetScale = isMobile ? 0.22 : 0.35;

      if (started) {
        const isClosed = currentPage === 0 || currentPage === 8;
        if (isClosed) {
          targetY = isMobile ? 0.45 : 0.4;
          targetZ = 0.5;
          targetScale = isMobile ? 0.52 : 1.0;
        } else {
          targetY = isMobile ? 0.62 : 0.5;
          targetZ = -0.3;
          targetScale = isMobile ? 0.46 : 1.08;
        }
        if (freeReading) {
          targetScale = isClosed ? (isMobile ? 0.48 : 0.92) : (isMobile ? 0.48 : 1.15);
          targetY = isClosed ? (isMobile ? 0.35 : 0.3) : (isMobile ? 0.8 : 0.7);
          targetZ = isClosed ? 0.4 : -0.2;
        }
      }

      // Handle book translation transition
      const lerpSpeed = 4.5;
      mainGroupRef.current.position.x = THREE.MathUtils.lerp(mainGroupRef.current.position.x, targetX, delta * lerpSpeed);
      mainGroupRef.current.position.y = THREE.MathUtils.lerp(mainGroupRef.current.position.y, targetY, delta * lerpSpeed);
      mainGroupRef.current.position.z = THREE.MathUtils.lerp(mainGroupRef.current.position.z, targetZ, delta * lerpSpeed);

      // Spring-based scaling transition for a premium bouncy zoom-in effect
      const currentScale = mainGroupRef.current.scale.x;
      const springStiffness = 30; // Reduced from 70 to make it zoom in a bit slower
      const springDamping = 10;   // Damping ratio for smooth settling
      
      const force = springStiffness * (targetScale - currentScale) - springDamping * scaleVelocity.current;
      scaleVelocity.current += force * delta;
      
      // Prevent instability from extreme delta spikes
      scaleVelocity.current = THREE.MathUtils.clamp(scaleVelocity.current, -8, 8);
      const nextScale = currentScale + scaleVelocity.current * delta;
      mainGroupRef.current.scale.set(nextScale, nextScale, nextScale);

      // Interpolate book rotation (applies to pages but not popup models)
      if (started) {
        bookRotationRef.current.rotation.x = THREE.MathUtils.lerp(
          bookRotationRef.current.rotation.x,
          targetRotation.current.x,
          delta * 8
        );
        bookRotationRef.current.rotation.y = THREE.MathUtils.lerp(
          bookRotationRef.current.rotation.y,
          targetRotation.current.y,
          delta * 8
        );
      } else {
        // Lay flat/low rotation during landing intro
        bookRotationRef.current.rotation.x = THREE.MathUtils.lerp(bookRotationRef.current.rotation.x, -Math.PI / 2.3, delta * 3.5);
        bookRotationRef.current.rotation.y = THREE.MathUtils.lerp(bookRotationRef.current.rotation.y, 0, delta * 3.5);
      }
    }
  });

  const leaves = [
    { index: 0, front: textures[0], back: textures[1] },
    { index: 1, front: textures[2], back: textures[3] },
    { index: 2, front: textures[4], back: textures[5] },
    { index: 3, front: textures[6], back: textures[7] },
    { index: 4, front: textures[8], back: textures[9] },
    { index: 5, front: textures[10], back: textures[11] },
    { index: 6, front: textures[12], back: textures[13] },
    { index: 7, front: textures[14], back: textures[15] }
  ];

  return (
    <>
      {/* ========================================== */}
      {/* PHẦN 1: KHỐI CUỐN SÁCH (CHUYỂN ĐỘNG THEO CHUỘT) */}
      {/* ========================================== */}
      <group ref={mainGroupRef} scale={[0.35, 0.35, 0.35]} position={[0, -1.2, -1.0]}>
        <group ref={bookRotationRef} rotation={[-Math.PI / 2.3, 0, 0]}>
          {/* Closed Book Thickness Filler (only when book is closed) */}
          {(!started || currentPage === 0 || currentPage === 8) && (
            <mesh 
              position={[0, -0.04, -3.5 * 0.024]} 
              rotation={[0, currentPage === 8 ? -Math.PI : 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width * 0.98, height * 0.98, 5 * 0.024]} />
              <meshStandardMaterial 
                color="#ede9e2" 
                roughness={0.9} 
                metalness={0.0} 
              />
            </mesh>
          )}

          {leaves.map((leaf) => {
            let progress = 0;
            if (currentPage > leaf.index) progress = 1;
            else if (currentPage === leaf.index) progress = 0;

            const maxLeafIdx = 7;
            const maxPageIdx = 8;
            const isClosed = currentPage === 0 || currentPage === maxPageIdx;

            // Both Leaf 0 and Leaf maxLeafIdx are visible when closed to render front and back covers correctly
            const pageVisibility = isClosed
              ? (leaf.index === 0 || leaf.index === maxLeafIdx)
              : true;

            let xOffset = 0;
            if (currentPage === 0) {
              xOffset = -width / 2;
            } else if (currentPage === maxPageIdx) {
              xOffset = width / 2;
            }

            return (
              <Page
                key={freeReading ? `free-${leaf.index}` : `normal-${leaf.index}`}
                index={leaf.index}
                frontTexture={leaf.front}
                backTexture={leaf.back}
                progress={progress}
                currentPage={currentPage}
                width={width}
                height={height}
                xOffset={xOffset}
                visible={pageVisibility}
                isBookOpen={currentPage > 0 && currentPage < maxPageIdx}
                totalLeaves={8}
                onClick={(e) => {
                  e.stopPropagation();
                  // Block page flipping if the action was a mouse drag
                  if (hasDragged.current) return;

                  const isLeftPage = leaf.index < currentPage;
                  if (isLeftPage) {
                    // If clicking the back cover in normal mode, transition to free reading
                    if (!freeReading && currentPage === maxPageIdx) {
                      setFreeReading(true);
                      setCurrentPage(0); // Start at front cover (BÌA)
                      return;
                    }
                    setCurrentPage(Math.max(0, currentPage - 1));
                  } else {
                    setCurrentPage(Math.min(maxPageIdx, currentPage + 1));
                  }
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => document.body.style.cursor = 'auto'}
              />
            );
          })}
        </group>

        {/* ========================================== */}
        {/* PHẦN 2: KHỐI MÔ HÌNH 3D (DUY CHUYỂN CÙNG SÁCH, HƯỚNG THẲNG ĐỨNG) */}
        {/* ========================================== */}

        {/* Trang 1: Monument */}
        <PopUpModel
          active={started && !freeReading && currentPage === 1}
          type="monument"
          modelPath="/models/trang1.glb"
          preloadDelay={2000}
        />

        {/* Trang 2: Globe */}
        <PopUpModel
          active={started && !freeReading && currentPage === 2}
          type="globe"
          modelPath="/models/trang2.glb"
          customScale={2.2}
          preloadDelay={3500}
        />

        {/* Trang 3: 3D Models (3.1, 3.2, 3.3 rotating every 5s) */}
        <PopUpModel
          active={started && !freeReading && currentPage === 3 && subModelIdx3 === 0}
          type="crystal"
          modelPath="/models/trang3.1.glb"
          preloadDelay={5000}
        />
        <PopUpModel
          active={started && !freeReading && currentPage === 3 && subModelIdx3 === 1}
          type="crystal"
          modelPath="/models/trang3.2.glb"
          preloadDelay={6500}
        />
        <PopUpModel
          active={started && !freeReading && currentPage === 3 && subModelIdx3 === 2}
          type="crystal"
          modelPath="/models/trang3.3.glb"
          preloadDelay={8000}
        />

        {/* Trang 4: 3D Models (4.1, 4.2 rotating every 5s) */}
        <PopUpModel
          active={started && !freeReading && currentPage === 4 && subModelIdx4 === 0}
          type="crystal"
          modelPath="/models/trang4.1.glb"
          customScale={0.8}
          preloadDelay={9500}
        />
        <PopUpModel
          active={started && !freeReading && currentPage === 4 && subModelIdx4 === 1}
          type="crystal"
          modelPath="/models/trang4.2.glb"
          customScale={0.8}
          preloadDelay={11000}
        />

        {/* Trang 5: Globe/Crystal */}
        <PopUpModel
          active={started && !freeReading && currentPage === 5}
          type="globe"
          modelPath="/models/trang5.glb"
          customScale={1.25}
          preloadDelay={12500}
        />

        {/* Trang 6: Monument */}
        <PopUpModel
          active={started && !freeReading && currentPage === 6}
          type="monument"
          modelPath="/models/trang6.glb"
          preloadDelay={14000}
        />

        {/* Trang 7: Globe */}
        <PopUpModel
          active={started && !freeReading && currentPage === 7}
          type="globe"
          modelPath="/models/trang7.glb"
          preloadDelay={15500}
        />
      </group>
    </>
  );
}