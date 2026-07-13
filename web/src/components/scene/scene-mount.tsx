"use client";

/**
 * Lazy mount for the interactive particle-field hero scene. Mirrors the
 * studio's aurora-mount pattern: the ~200KB three/R3F chunk never blocks
 * the server-rendered hero text (LCP).
 *
 * Gate order — decided BEFORE the chunk is even requested:
 *   1. prefers-reduced-motion: reduce  → static gradient-blob poster
 *   2. viewport < minWidth             → static poster (chunk never fetched)
 *   3. no WebGL                        → static poster
 *   4. otherwise                       → requestIdleCallback →
 *      next/dynamic(() => import("./hero-scene"), { ssr: false })
 *
 * The layer is absolute inset-0, aria-hidden and pointer-events-none; the
 * scene listens to pointer/touch/scroll on window from inside hero-scene,
 * so it needs no pointer events on this layer.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SUSLIK_PARTS } from "./suslik-shape";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

type SceneMountProps = {
  /** Persona accent as a hex color; forwarded to the particle color. */
  accent?: string;
  /**
   * Minimum viewport width (px) at which the WebGL scene is worth mounting.
   * Persona pages hide the scene wrapper below `sm` (display:none) — they
   * pass 640 so the ~200KB three/R3F chunk is never fetched (and no WebGL
   * context is created) where the layer is invisible. Below the gate the
   * cheap SVG poster renders instead (also invisible there, but free).
   */
  minWidth?: number;
};

/**
 * Notify a mounted hero scene that the visitor picked a persona: the
 * particle field morphs into the persona glyph and recolors to its accent.
 * Safe to call whether or not the scene is (or ever will be) mounted.
 */
export function emitPersona(persona: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("sl:persona", { detail: { persona } }),
  );
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
    );
  } catch {
    return false;
  }
}

/**
 * Static fallback: a soft radial-gradient blob with the same suslik-mascot
 * silhouette the particles assemble into, rendered from the shared analytic
 * primitives (suslik-shape.ts). Shown when reduced motion is requested or
 * WebGL is unavailable — in those cases the three.js chunk is never
 * downloaded. Pure SVG, no external assets.
 */
export function HeroPoster({ accent }: { accent?: string }) {
  const color = accent ?? "#b4552d";
  const gradientId = "sl-hero-blob";
  return (
    <svg
      viewBox="-0.35 -0.12 1.7 1.24"
      // Mobile (where this poster IS the hero art — the WebGL scene is gated
      // off): larger, peeking in from the right edge behind the headline.
      // ≥sm keeps the old centered sizing for the reduced-motion/no-WebGL
      // fallback of the full scene.
      className="h-72 w-72 max-w-[72vw] max-sm:-mr-16 max-sm:mt-20 max-sm:h-[22rem] max-sm:w-[22rem] max-sm:max-w-none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="55%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* organic two-lobe gradient blob behind the mascot */}
      <ellipse cx="0.52" cy="0.52" rx="0.82" ry="0.6" fill={`url(#${gradientId})`} />
      <ellipse cx="0.3" cy="0.34" rx="0.5" ry="0.42" fill={`url(#${gradientId})`} />
      {/* the same silhouette the particle field assembles into */}
      <g fill={color} opacity="0.85">
        {SUSLIK_PARTS.map((p, i) => {
          if (p.kind === "ellipse") {
            const deg = ((p.rot ?? 0) * 180) / Math.PI;
            return (
              <ellipse
                key={i}
                cx={p.cx}
                cy={p.cy}
                rx={p.rx}
                ry={p.ry}
                transform={
                  p.rot ? `rotate(${deg} ${p.cx} ${p.cy})` : undefined
                }
              />
            );
          }
          // Varying-radius capsule ≈ circles lerped along the segment.
          const steps = 6;
          return (
            <g key={i}>
              {Array.from({ length: steps + 1 }, (_, k) => {
                const t = k / steps;
                return (
                  <circle
                    key={k}
                    cx={p.x1 + (p.x2 - p.x1) * t}
                    cy={p.y1 + (p.y2 - p.y1) * t}
                    r={p.r1 + (p.r2 - p.r1) * t}
                  />
                );
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function SceneMount({ accent, minWidth }: SceneMountProps) {
  // "pending" until the client-side gates have run — renders nothing on the
  // server and on first paint, so there is no hydration mismatch and the
  // hero text stays the LCP either way.
  const [mode, setMode] = useState<"pending" | "poster" | "scene">("pending");

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const tooNarrow =
      typeof minWidth === "number" &&
      !window.matchMedia(`(min-width: ${minWidth}px)`).matches;
    if (reduceMotion || tooNarrow || !supportsWebGL()) {
      setMode("poster");
      return;
    }
    // Defer the heavy chunk until the main thread is idle (Safari has no
    // requestIdleCallback — fall back to a short timeout).
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setMode("scene"), {
        timeout: 2000,
      });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setMode("scene"), 300);
    return () => window.clearTimeout(id);
  }, [minWidth]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {mode === "poster" ? (
        <div className="flex h-full w-full items-center justify-center max-sm:items-start max-sm:justify-end max-sm:overflow-hidden">
          <HeroPoster accent={accent} />
        </div>
      ) : null}
      {mode === "scene" ? <HeroScene accent={accent} /> : null}
    </div>
  );
}
