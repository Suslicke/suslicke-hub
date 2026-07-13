"use client";

/**
 * Lazy mount for the voxel-QR hero scene. Mirrors the studio's
 * aurora-mount pattern: the ~200KB three/R3F chunk never blocks the
 * server-rendered hero text (LCP).
 *
 * Gate order — decided BEFORE the chunk is even requested:
 *   1. prefers-reduced-motion: reduce  → static SVG QR poster, no download
 *   2. no WebGL                        → static SVG QR poster, no download
 *   3. otherwise                       → requestIdleCallback →
 *      next/dynamic(() => import("./hero-scene"), { ssr: false })
 *
 * The layer is absolute inset-0, aria-hidden and pointer-events-none; the
 * scene's parallax listens to pointermove on window from inside hero-scene,
 * so it needs no pointer events on this layer.
 */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import qrData from "../../../public/qr-matrix.json";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

type SceneMountProps = {
  /** Persona accent as a hex color; forwarded to the scene's voxel emissive. */
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
 * Static fallback: the same baked QR matrix rendered as a single SVG path
 * (still scannable). Shown when reduced motion is requested or WebGL is
 * unavailable — in those cases the three.js chunk is never downloaded.
 */
export function QrPoster({ accent }: { accent?: string }) {
  const { size } = qrData;
  const quiet = 2; // quiet-zone modules around the code
  const path = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < qrData.modules.length; i++) {
      if (!qrData.modules[i]) continue;
      const x = (i % size) + quiet;
      const y = Math.floor(i / size) + quiet;
      parts.push(`M${x} ${y}h1v1h-1z`);
    }
    return parts.join("");
  }, [size]);

  const box = size + quiet * 2;
  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      className="h-56 w-56 max-w-[64vw] opacity-85"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d={path} fill={accent ?? "var(--foreground)"} />
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
        <div className="flex h-full w-full items-center justify-center">
          <QrPoster accent={accent} />
        </div>
      ) : null}
      {mode === "scene" ? <HeroScene accent={accent} /> : null}
    </div>
  );
}
