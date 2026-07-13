"use client";

/**
 * Voxel-QR hero scene (React Three Fiber).
 *
 * One InstancedMesh of cubes — one instance per dark module of the baked
 * QR matrix (public/qr-matrix.json, encodes https://suslicke.com/qr, EC H).
 * On mount the voxels fly in from random shell positions and lerp into the
 * QR grid (~1.5s, staggered, ease-out), then keep a gentle "breathing"
 * z-wobble plus a pointer/gyro parallax tilt.
 *
 * Perf contract (see design doc):
 *  - dpr clamped to [1, 1.75], antialias off, transparent clear color
 *  - frameloop pauses when the canvas is offscreen (IntersectionObserver)
 *    or the tab is hidden (visibilitychange)
 *  - no drei Environment / GLTF / external assets — plain lights only.
 *
 * Loaded exclusively through scene-mount.tsx (dynamic, ssr:false, after
 * idle, gated on WebGL + prefers-reduced-motion). Do not import directly
 * from server components.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import qrData from "../../../public/qr-matrix.json";

const ASSEMBLE_DURATION = 1.5; // s, per-voxel flight time
const MAX_STAGGER = 0.45; // s, random per-voxel start delay
const BREATHE_AMPLITUDE = 0.14; // world units (module = 1 unit)
const PARALLAX_X = 0.16; // rad, tilt around X for vertical pointer travel
const PARALLAX_Y = 0.24; // rad, tilt around Y for horizontal pointer travel

type HeroSceneProps = {
  /** Persona accent as a hex color (three.js can't parse oklch vars). */
  accent?: string;
};

const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;

function Voxels({ accent, voxelColor }: { accent: string; voxelColor: string }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 }); // normalized [-1, 1]
  const { viewport } = useThree();

  const { count, targets, starts, delays, phases } = useMemo(() => {
    const { size, modules } = qrData;
    const cells: number[] = [];
    for (let i = 0; i < modules.length; i++) {
      if (modules[i]) cells.push(i);
    }
    const count = cells.length;
    const targets = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const delays = new Float32Array(count);
    const phases = new Float32Array(count);
    const half = (size - 1) / 2;
    for (let i = 0; i < count; i++) {
      const cell = cells[i];
      // Grid target, centered on the origin, y flipped so the QR reads upright.
      targets[i * 3] = (cell % size) - half;
      targets[i * 3 + 1] = half - Math.floor(cell / size);
      targets[i * 3 + 2] = 0;
      // Random start on a loose spherical shell around the grid.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = size * (0.9 + Math.random() * 0.8);
      starts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starts[i * 3 + 2] = r * Math.cos(phi) * 0.6;
      delays[i] = Math.random() * MAX_STAGGER;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { count, targets, starts, delays, phases };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Parallax inputs: pointermove on window (the mount layer itself is
  // pointer-events-none) + optional deviceorientation on mobile.
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      // gamma: left/right tilt (-90..90); beta: front/back, ~45° in hand.
      pointerRef.current.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
      pointerRef.current.y = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    // No iOS permission prompt (needs a user gesture) — Android and desktops
    // that emit the event get gyro parallax for free, others keep pointer.
    window.addEventListener("deviceorientation", onOrientation, {
      passive: true,
    });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const group = groupRef.current;
    if (!mesh || !group) return;

    // Own accumulated clock (capped delta) so pausing offscreen doesn't
    // fast-forward the assembly when the frameloop resumes.
    timeRef.current += Math.min(delta, 0.05);
    const t = timeRef.current;

    for (let i = 0; i < count; i++) {
      const p = THREE.MathUtils.clamp(
        (t - delays[i]) / ASSEMBLE_DURATION,
        0,
        1,
      );
      const e = easeOutCubic(p);
      const i3 = i * 3;
      // Breathing only once the voxel has landed.
      const breathe =
        p >= 1 ? Math.sin(t * 1.2 + phases[i]) * BREATHE_AMPLITUDE : 0;
      dummy.position.set(
        starts[i3] + (targets[i3] - starts[i3]) * e,
        starts[i3 + 1] + (targets[i3 + 1] - starts[i3 + 1]) * e,
        starts[i3 + 2] + (targets[i3 + 2] - starts[i3 + 2]) * e + breathe,
      );
      dummy.scale.setScalar(0.35 + 0.65 * e);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Fit the QR into ~78% of the smaller viewport side, whole-group scale.
    const fit =
      (Math.min(viewport.width, viewport.height) * 0.78) / qrData.size;
    group.scale.setScalar(fit);

    // Pointer parallax with soft damping + a slow idle sway.
    const targetY = pointerRef.current.x * PARALLAX_Y + Math.sin(t * 0.35) * 0.03;
    const targetX = -pointerRef.current.y * PARALLAX_X + Math.cos(t * 0.28) * 0.02;
    const damp = Math.min(1, delta * 4);
    group.rotation.y += (targetY - group.rotation.y) * damp;
    group.rotation.x += (targetX - group.rotation.x) * damp;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.88, 0.88, 0.88]} />
        <meshStandardMaterial
          color={voxelColor}
          emissive={accent}
          emissiveIntensity={0.28}
          roughness={0.65}
          metalness={0}
        />
      </instancedMesh>
    </group>
  );
}

export default function HeroScene({ accent = "#c96f4a" }: HeroSceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Pause the frameloop when offscreen or the tab is hidden.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    io.observe(el);
    const onVisibility = () => setPageVisible(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // three.Color can't parse the oklch() CSS vars, so the voxel base color is
  // picked per theme here: dark warm brown on the sandy light background,
  // warm paper-light on the evening-blue dark background. next-themes toggles
  // the `dark` class on <html>; watch it so the scene follows live switches.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const active = inView && pageVisible;
  const voxelColor = isDark ? "#efe4cd" : "#46322a";

  return (
    <div ref={wrapRef} className="h-full w-full">
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 34], fov: 42 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[6, 8, 10]} intensity={1.1} />
        <Voxels accent={accent} voxelColor={voxelColor} />
      </Canvas>
    </div>
  );
}
