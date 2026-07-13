"use client";

/**
 * Interactive particle-field hero scene (React Three Fiber).
 *
 * ONE THREE.Points with a custom ShaderMaterial (~3–6k particles, adaptive
 * by viewport width). Particles fly in from a loose cloud and assemble into
 * the suslik-mascot silhouette (sampled analytically — see suslik-shape.ts).
 * Choosing a persona morphs the field into that persona's glyph ("₸", "</>",
 * "CV", "👋") and recolors it to the persona accent.
 *
 * Interactivity:
 *  - pointer / touch repels particles (gaussian falloff in the shader)
 *  - click / tap emits a ring ripple from the hit point
 *  - gentle parallax tilt from pointer (or gyro on devices that emit it)
 *  - scroll over the first ~80vh scatters the particles upward + fades them
 *  - `sl:persona` CustomEvent (or `localStorage sl_persona` at mount) →
 *    morph + recolor; emit via `emitPersona()` from scene-mount.tsx
 *
 * Perf contract:
 *  - dpr clamped to [1, 1.75], antialias off, transparent clear color
 *  - frameloop pauses offscreen (IntersectionObserver) and on hidden tab
 *  - no drei, no GLTF, no external assets — one draw call, vertex math only
 *
 * Loaded exclusively through scene-mount.tsx (dynamic, ssr:false, after
 * idle, gated on WebGL + prefers-reduced-motion). Do not import directly
 * from server components.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  isPersona,
  PERSONA_ACCENT_HEX,
  PERSONA_STORAGE_KEY,
  type Persona,
} from "@/lib/config";
import { sampleCloud, sampleShape, type SceneShape } from "./shapes";

const DEFAULT_ACCENT = "#b4552d"; // steppe terracotta

const MORPH_DURATION = 1.2; // s, uProgress 0→1 per morph
const MORPH_STAGGER = 0.35; // fraction of the morph used for per-particle delay
const SCATTER_RANGE = 0.8; // scroll scatter completes over 0.8 * viewport height

type HeroSceneProps = {
  /** Persona accent as a hex color (three.js can't parse oklch vars). */
  accent?: string;
};

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;      // linear 0..1, eased per-particle below
  uniform float uFit;        // shape units -> world units
  uniform float uScatter;    // 0..1 scroll scatter
  uniform float uSize;       // base point size in px (dpr included)
  uniform float uPointerK;   // pointer force gate 0..1
  uniform vec2 uPointer;     // pointer, world units at z=0
  uniform vec2 uClickPos;    // last click, world units
  uniform float uClickTime;  // shader-clock time of last click (-1e3 = none)

  attribute vec3 aTarget;
  attribute vec4 aSeed;      // x: stagger 0..1, y: phase, z: size var, w: rand 0..1

  varying float vAlpha;
  varying float vTint;

  float easeOutCubic(float p) { float q = 1.0 - p; return 1.0 - q * q * q; }

  void main() {
    // Staggered, eased morph between the previous and next shape.
    float p = clamp((uMorph - aSeed.x * ${MORPH_STAGGER}) / ${1 - MORPH_STAGGER}, 0.0, 1.0);
    vec3 pos = mix(position, aTarget, easeOutCubic(p));

    // Breathing: layered sines ≈ cheap curl jitter, always alive.
    float t = uTime;
    pos.x += sin(t * 0.9 + aSeed.y + pos.y * 3.1) * 0.014
           + sin(t * 0.53 + pos.x * 2.3 + aSeed.y * 2.0) * 0.009;
    pos.y += cos(t * 0.8 + aSeed.y * 1.7 + pos.x * 2.9) * 0.014
           + cos(t * 0.61 + pos.y * 2.1) * 0.009;
    pos.z += sin(t * 0.7 + aSeed.y * 2.3) * 0.03;

    vec3 world = pos * uFit;

    // Scroll scatter: drift up and sideways, per-particle randomness.
    float sc = uScatter * (0.35 + 0.65 * aSeed.w);
    world.xy += vec2(sin(aSeed.y * 4.7) * 0.55, 1.1 + aSeed.w * 0.9) * sc * uFit;

    // Pointer repulsion (gaussian falloff).
    vec2 dp = world.xy - uPointer;
    float pr = uFit * 0.42;
    float force = exp(-dot(dp, dp) / (pr * pr * 0.5)) * uPointerK;
    vec2 dir = dp / max(length(dp), 1e-4);
    world.xy += dir * force * uFit * 0.2;
    world.z += force * uFit * 0.1;

    // Click ripple: expanding ring with decaying amplitude.
    float age = uTime - uClickTime;
    if (age > 0.0 && age < 2.5) {
      vec2 dc = world.xy - uClickPos;
      float cd = length(dc);
      float ring = age * uFit * 1.7;
      float band = exp(-pow((cd - ring) / (uFit * 0.16), 2.0));
      float amp = exp(-age * 1.9) * uFit * 0.16;
      world.xy += (dc / max(cd, 1e-4)) * band * amp;
      world.z += band * amp * 0.8;
    }

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aSeed.z * (7.0 / max(-mv.z, 0.1));

    vAlpha = 1.0 - uScatter * 0.85;
    vTint = aSeed.w;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDark; // 0 light theme, 1 dark theme
  varying float vAlpha;
  varying float vTint;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float disk = smoothstep(0.5, 0.2, d);
    // Dark theme: lift toward white for a warm glow (additive blending);
    // light theme: deepen slightly so the dots hold up on the sandy bg.
    vec3 col = mix(uColor * 0.92, vec3(1.0), uDark * (0.32 + 0.26 * vTint));
    float alpha = disk * vAlpha * (0.72 + 0.28 * vTint) * (1.0 + uDark * 0.35);
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Particle count adapted to viewport width / dpr (fill-rate bound). */
function pickCount(): number {
  if (typeof window === "undefined") return 4000;
  const w = window.innerWidth;
  const base = w < 640 ? 3000 : w < 1024 ? 4200 : 5500;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  return dpr > 1.4 ? Math.round(base * 0.88) : base;
}

/** Read the persona choice persisted by the persona chips, if any. */
function storedShape(): Persona | null {
  try {
    const v = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    return v && isPersona(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Persona pages pass their accent hex but no persona (fixed SceneMount
 * API) — recover the persona from the accent so the field assembles
 * straight into the page's glyph instead of the mascot.
 */
function personaFromAccent(accent?: string): Persona | null {
  if (!accent) return null;
  const hex = accent.toLowerCase();
  for (const p of Object.keys(PERSONA_ACCENT_HEX) as Persona[]) {
    if (PERSONA_ACCENT_HEX[p].toLowerCase() === hex) return p;
  }
  return null;
}

function ParticleField({
  accent,
  isDark,
}: {
  accent: string;
  isDark: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const count = useMemo(() => pickCount(), []);

  // Initial state, decided once at mount: the page's persona (via accent)
  // wins over a persona remembered in localStorage, then the mascot.
  const [initialShape] = useState<SceneShape>(() => {
    return personaFromAccent(accent) ?? storedShape() ?? "suslik";
  });
  const [initialPersonaColor] = useState<string | null>(() => {
    if (personaFromAccent(accent)) return null; // accent prop already matches
    const stored = storedShape();
    return stored ? PERSONA_ACCENT_HEX[stored] : null;
  });

  // Geometry + material built once, imperatively (no drei).
  const { geometry, material, uniforms } = useMemo(() => {
    const from = sampleCloud(count);
    const to = sampleShape(initialShape, count);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = Math.random();
      seeds[i * 4 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 2] = 0.7 + Math.random() * 0.7;
      seeds[i * 4 + 3] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(from, 3));
    geometry.setAttribute("aTarget", new THREE.BufferAttribute(to, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    // Displacements never leave this sphere; skip per-frame bbox work.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uFit: { value: 1 },
      uScatter: { value: 0 },
      uSize: { value: 3 },
      uPointerK: { value: 0 },
      uPointer: { value: new THREE.Vector2(9999, 9999) },
      uClickPos: { value: new THREE.Vector2(0, 0) },
      uClickTime: { value: -1e3 },
      uColor: { value: new THREE.Color(DEFAULT_ACCENT) },
      uDark: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
    });
    return { geometry, material, uniforms };
  }, [count, initialShape]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // ---- mutable interaction state (refs, no re-renders) -------------------
  const shapeRef = useRef<SceneShape>(initialShape);
  const morphStartRef = useRef(0); // shader-clock time the current morph began
  const timeRef = useRef(0); // own accumulated clock (pauses offscreen)
  const pointerNdc = useRef({ x: 10, y: 10, inside: false });
  const gyro = useRef({ x: 0, y: 0, active: false });
  const clickQueue = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef(0);
  const colorTarget = useRef(new THREE.Color(initialPersonaColor ?? accent));
  const personaColor = useRef<string | null>(initialPersonaColor);

  // Morph the field to a new target shape; current base positions become
  // the new "from" (frozen mid-flight if a morph was still running).
  const morphTo = useMemo(() => {
    const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
    return (shape: SceneShape) => {
      if (shape === shapeRef.current) return;
      shapeRef.current = shape;
      const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
      const tgtAttr = geometry.getAttribute("aTarget") as THREE.BufferAttribute;
      const seedAttr = geometry.getAttribute("aSeed") as THREE.BufferAttribute;
      const from = posAttr.array as Float32Array;
      const to = tgtAttr.array as Float32Array;
      const seeds = seedAttr.array as Float32Array;
      const raw = Math.min(
        (timeRef.current - morphStartRef.current) / MORPH_DURATION,
        1,
      );
      // Freeze each particle where the shader currently renders it.
      for (let i = 0; i < count; i++) {
        const p = Math.min(
          Math.max((raw - seeds[i * 4] * MORPH_STAGGER) / (1 - MORPH_STAGGER), 0),
          1,
        );
        const e = easeOutCubic(p);
        const i3 = i * 3;
        from[i3] += (to[i3] - from[i3]) * e;
        from[i3 + 1] += (to[i3 + 1] - from[i3 + 1]) * e;
        from[i3 + 2] += (to[i3 + 2] - from[i3 + 2]) * e;
      }
      to.set(sampleShape(shape, count));
      posAttr.needsUpdate = true;
      tgtAttr.needsUpdate = true;
      morphStartRef.current = timeRef.current;
      uniforms.uMorph.value = 0;
    };
  }, [count, geometry, uniforms]);

  // ---- window-level listeners (the mount layer is pointer-events-none) ---
  useEffect(() => {
    const setNdc = (clientX: number, clientY: number) => {
      pointerNdc.current.x = (clientX / window.innerWidth) * 2 - 1;
      pointerNdc.current.y = -((clientY / window.innerHeight) * 2 - 1);
      pointerNdc.current.inside = true;
    };
    const onPointerMove = (e: PointerEvent) => setNdc(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setNdc(t.clientX, t.clientY);
    };
    const onPointerDown = (e: PointerEvent) => {
      setNdc(e.clientX, e.clientY);
      clickQueue.current = {
        x: pointerNdc.current.x,
        y: pointerNdc.current.y,
      };
    };
    const onLeave = () => {
      pointerNdc.current.inside = false;
    };
    const onScroll = () => {
      scrollRef.current = Math.min(
        Math.max(window.scrollY / (window.innerHeight * SCATTER_RANGE), 0),
        1,
      );
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      gyro.current.x = THREE.MathUtils.clamp(e.gamma / 30, -1, 1);
      gyro.current.y = THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1);
      gyro.current.active = true;
    };
    const onPersona = (e: Event) => {
      const persona = (e as CustomEvent<{ persona?: string }>).detail?.persona;
      if (persona && isPersona(persona)) {
        personaColor.current = PERSONA_ACCENT_HEX[persona];
        morphTo(persona);
      }
    };

    onScroll();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("touchend", onLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    // No iOS permission prompt (needs a user gesture) — Android and desktops
    // that emit the event get gyro parallax for free, others keep pointer.
    window.addEventListener("deviceorientation", onOrientation, {
      passive: true,
    });
    window.addEventListener("sl:persona", onPersona);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("touchend", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("sl:persona", onPersona);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [morphTo]);

  // Accent prop / theme → shader targets (persona pick wins over the prop).
  useEffect(() => {
    colorTarget.current.set(personaColor.current ?? accent);
    // Snap on (re)mount / prop change; persona-event recolors glide instead.
    (uniforms.uColor.value as THREE.Color).copy(colorTarget.current);
  }, [accent, uniforms]);
  useEffect(() => {
    material.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    material.needsUpdate = true;
  }, [isDark, material]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    // Own accumulated clock (capped delta) so pausing offscreen doesn't
    // fast-forward morphs/ripples when the frameloop resumes.
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const t = timeRef.current;
    const damp = Math.min(1, dt * 4);

    uniforms.uTime.value = t;
    uniforms.uMorph.value = Math.min(
      (t - morphStartRef.current) / MORPH_DURATION,
      1,
    );

    // Fit the ~1.9-unit-tall shape into ~82% of the smaller viewport side.
    const fit = (Math.min(viewport.width, viewport.height) * 0.82) / 1.9;
    uniforms.uFit.value = fit;
    uniforms.uSize.value =
      Math.min(window.devicePixelRatio || 1, 1.75) * (count > 4500 ? 3.5 : 4.0);

    // Pointer NDC → world at z=0, softly damped; force gate eases in/out.
    const px = (pointerNdc.current.x * viewport.width) / 2;
    const py = (pointerNdc.current.y * viewport.height) / 2;
    const up = uniforms.uPointer.value as THREE.Vector2;
    if (uniforms.uPointerK.value < 0.01 && pointerNdc.current.inside) {
      up.set(px, py); // teleport on first entry, no fly-in artifact
    } else {
      up.x += (px - up.x) * Math.min(1, dt * 10);
      up.y += (py - up.y) * Math.min(1, dt * 10);
    }
    const kTarget = pointerNdc.current.inside ? 1 : 0;
    uniforms.uPointerK.value +=
      (kTarget - uniforms.uPointerK.value) * Math.min(1, dt * 6);

    // Queued click → ripple origin in world units.
    if (clickQueue.current) {
      (uniforms.uClickPos.value as THREE.Vector2).set(
        (clickQueue.current.x * viewport.width) / 2,
        (clickQueue.current.y * viewport.height) / 2,
      );
      uniforms.uClickTime.value = t;
      clickQueue.current = null;
    }

    // Scroll scatter, smoothed.
    uniforms.uScatter.value +=
      (scrollRef.current - uniforms.uScatter.value) * Math.min(1, dt * 5);

    // Accent color glide (persona recolor / theme-independent).
    (uniforms.uColor.value as THREE.Color).lerp(colorTarget.current, damp);
    uniforms.uDark.value += ((isDark ? 1 : 0) - uniforms.uDark.value) * damp;

    // Parallax tilt: pointer (or gyro) + slow idle sway.
    const sx = gyro.current.active ? gyro.current.x : pointerNdc.current.inside ? pointerNdc.current.x : 0;
    const sy = gyro.current.active ? gyro.current.y : pointerNdc.current.inside ? -pointerNdc.current.y : 0;
    const targetY = sx * 0.16 + Math.sin(t * 0.32) * 0.035;
    const targetX = sy * 0.1 + Math.cos(t * 0.27) * 0.025;
    group.rotation.y += (targetY - group.rotation.y) * damp;
    group.rotation.x += (targetX - group.rotation.x) * damp;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export default function HeroScene({ accent = DEFAULT_ACCENT }: HeroSceneProps) {
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

  // three.Color can't parse the oklch() CSS vars, so the theme is tracked via
  // the `dark` class next-themes toggles on <html> (safer than useTheme —
  // no context dependency inside the lazily-mounted chunk).
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const active = inView && pageVisible;

  return (
    <div ref={wrapRef} className="h-full w-full">
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 7], fov: 40 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ParticleField accent={accent} isDark={isDark} />
      </Canvas>
    </div>
  );
}
