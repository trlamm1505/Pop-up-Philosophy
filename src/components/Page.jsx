import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Page component representing a single leaf of the book.
 * Uses two overlapping meshes (FrontSide and BackSide) to render independent
 * front and back textures without custom shader binding limitations.
 * Bends programmatically on the GPU via onBeforeCompile.
 */
export default function Page({
  index,
  frontTexture,
  backTexture,
  progress,
  width = 4,
  height = 6,
  bendFactor = 0.35,
  curlFactor = 0.2,
  xOffset = 0,
  visible = true,
  isBookOpen = false,
  onClick,
  onPointerOver,
  onPointerOut,
  totalLeaves = 8
}) {
  const meshRef = useRef();

  // Custom uniforms for the vertex shader
  const uniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uBend: { value: bendFactor },
    uCurl: { value: curlFactor },
    uWidth: { value: width },
    uHeight: { value: height },
    uSpineHinge: { value: 0.08 }, // Smooth bend transition width at spine (0.0 to 1.0)
    uRestingCurve: { value: isBookOpen ? 1.0 : 0.0 }
  }), []); // Stable uniforms reference to prevent HMR hook crashes

  // Keep uniforms in sync if props change
  useEffect(() => {
    uniforms.uBend.value = bendFactor;
    uniforms.uCurl.value = curlFactor;
    uniforms.uWidth.value = width;
    uniforms.uHeight.value = height;
    uniforms.uRestingCurve.value = isBookOpen ? 1.0 : 0.0;
  }, [bendFactor, curlFactor, width, height, isBookOpen, uniforms]);

  // Update uniforms and handle smooth rotation progression
  useFrame((state, delta) => {
    if (uniforms.uProgress) {
      // Smoothly lerp uniform progress to target progress prop (6 units/sec)
      uniforms.uProgress.value = THREE.MathUtils.lerp(
        uniforms.uProgress.value,
        progress,
        delta * 6
      );
    }

    if (meshRef.current) {
      // Dynamic stacking depth offset to prevent Z-fighting.
      const currentProg = uniforms.uProgress.value;
      const baseZ = -index * 0.024;
      const targetZ = -((totalLeaves - 1) - index) * 0.024;
      meshRef.current.position.z = THREE.MathUtils.lerp(baseZ, targetZ, currentProg);

      // Smoothly slide page horizontally based on closed/centered offset
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, xOffset, delta * 8);

      // Rotate the page mesh on the CPU around the Y-axis to match its flip progress.
      // We add a tiny micro-tilt to prevent visual alignment overlaps.
      meshRef.current.rotation.y = - (currentProg * Math.PI) + currentProg * 0.002;
    }
  });

  // Create high segment count geometry and translate so spine is at X = 0
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, 64, 64);
    geo.translate(width / 2, 0, 0); // Spine is at X = 0, page extends to X = width
    return geo;
  }, [width, height]);

  // Common vertex shader modification to deform the page geometry
  const applyVertexDeformation = (shader) => {
    shader.uniforms.uProgress = uniforms.uProgress;
    shader.uniforms.uBend = uniforms.uBend;
    shader.uniforms.uCurl = uniforms.uCurl;
    shader.uniforms.uWidth = uniforms.uWidth;
    shader.uniforms.uHeight = uniforms.uHeight;
    shader.uniforms.uSpineHinge = uniforms.uSpineHinge;
    shader.uniforms.uRestingCurve = uniforms.uRestingCurve;

    // 1. Prepend shader functions to Vertex Shader
    shader.vertexShader = `
      uniform float uProgress;
      uniform float uBend;
      uniform float uCurl;
      uniform float uWidth;
      uniform float uHeight;
      uniform float uSpineHinge;
      uniform float uRestingCurve;

      // Custom deformation function for the page turn
      vec3 deform(vec3 pos, float progress, float bend, float curl, float w, float h, float restingCurve) {
        float u = pos.x; // Distance from spine (0 to w)
        float v = pos.y; // Height along page (-h/2 to h/2)

        float sinProgress = sin(progress * 3.14159265);
        float uRatio = u / w;
        float vRatio = abs(v) / (h * 0.5);

        // The local bending angle of the page (excluding the base flip rotation)
        float localAngle = - sinProgress * (bend * uRatio + curl * uRatio * vRatio);

        // Smooth transition near the spine hinge to prevent sharp crease
        float spineT = smoothstep(0.0, uSpineHinge, uRatio);
        localAngle = mix(0.0, localAngle, spineT);

        vec3 def = vec3(0.0);
        def.x = u * cos(localAngle);
        def.z = u * sin(localAngle); // Bend out into Z-axis
        def.y = v;

        // Add a subtle depth lifting during the transition
        def.z += sinProgress * 0.15 * (1.0 - uRatio);

        // Add a resting curve that is always arched upwards towards the camera.
        // We multiply by cos(progress * PI) to compensate for CPU rotation.
        float restingZ = 0.52 * sin(pow(uRatio, 0.72) * 3.14159265) * restingCurve * cos(progress * 3.14159265);
        def.z += restingZ;

        return def;
      }
    ` + shader.vertexShader;

    // 2. Modify Position in Vertex Shader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        vec3 pos0 = position;
        vec3 def0_pos = deform(pos0, uProgress, uBend, uCurl, uWidth, uHeight, uRestingCurve);
        vec3 transformed = def0_pos;
      `
    );

    // 3. Recompute Normals in Vertex Shader using Finite Differences
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
        float eps = 0.01;
        vec3 def0_norm = deform(position, uProgress, uBend, uCurl, uWidth, uHeight, uRestingCurve);
        
        vec3 posU = position + vec3(eps, 0.0, 0.0);
        vec3 posV = position + vec3(0.0, eps, 0.0);
        
        vec3 defU = deform(posU, uProgress, uBend, uCurl, uWidth, uHeight, uRestingCurve);
        vec3 defV = deform(posV, uProgress, uBend, uCurl, uWidth, uHeight, uRestingCurve);
        
        vec3 tangentU = defU - def0_norm;
        vec3 tangentV = defV - def0_norm;
        
        // Normal is the cross product of U and V tangents
        vec3 objectNormal = normalize(cross(tangentU, tangentV));
      `
    );
  };

  // Front Page Material (Renders FrontSide of plane)
  const frontMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: frontTexture,
      roughness: 0.85, // Matte paper finish to eliminate glare
      metalness: 0.0,
      side: THREE.FrontSide,
      shadowSide: THREE.FrontSide
    });
    mat.onBeforeCompile = applyVertexDeformation;
    return mat;
  }, [frontTexture]);

  // Back Page Material (Renders BackSide of plane)
  const backMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: backTexture,
      color: 0xffffff, // Đã xóa màu đỏ test, đổi về trắng để giữ nguyên màu ảnh gốc
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.BackSide,
      shadowSide: THREE.BackSide
    });
    mat.onBeforeCompile = applyVertexDeformation;
    return mat;
  }, [backTexture]);

  return (
    <group
      ref={meshRef}
      visible={visible}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Front Page Mesh */}
      <mesh
        geometry={geometry}
        material={frontMaterial}
        castShadow
        receiveShadow
      />
      {/* Back Page Mesh */}
      <mesh
        geometry={geometry}
        material={backMaterial}
        castShadow
        receiveShadow
      />
    </group>
  );
}
