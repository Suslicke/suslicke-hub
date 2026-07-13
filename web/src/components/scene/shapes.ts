/**
 * Particle target-shape samplers for the hero scene.
 *
 * Every shape is returned as a Float32Array of xyz triples in a normalized
 * "shape space": x/y roughly in [-1, 1] (aspect preserved, y up), z a small
 * random spread for depth. The vertex shader multiplies by a fit uniform to
 * scale into world units, so the same arrays work at any viewport size.
 *
 * - "suslik": the mascot silhouette, rejection-sampled from the analytic
 *   union in suslik-shape.ts, with extra samples biased to the boundary so
 *   the outline reads crisply.
 * - persona glyphs: text drawn on an offscreen 2D canvas ("$", "</>", "CV",
 *   "👋"), sampled from the alpha channel — reliable for any font/emoji.
 *
 * Client-only (the glyph sampler touches `document`); called from
 * hero-scene.tsx which is loaded dynamically with ssr:false.
 */

import { insideSuslik, SUSLIK_BBOX } from "./suslik-shape";

export type SceneShape = "suslik" | "biz" | "dev" | "hr" | "hi";

const PERSONA_GLYPH: Record<Exclude<SceneShape, "suslik">, string> = {
  biz: "$",
  dev: "</>",
  hr: "CV",
  hi: "👋",
};

/** Depth spread of the particle slab, in shape units. */
const Z_SPREAD = 0.14;
/** Suslik unit space (height 1) → shape space scale. */
const SUSLIK_SCALE = 1.9;

function sampleSuslik(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const { minX, maxX, minY, maxY } = SUSLIK_BBOX;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const eps = 0.011;
  // ~35% of the particles hug the outline for a crisper silhouette.
  const edgeCount = Math.floor(count * 0.35);

  let i = 0;
  let guard = 0;
  const maxIter = count * 600;
  while (i < count && guard < maxIter) {
    guard++;
    const x = minX + Math.random() * spanX;
    const y = minY + Math.random() * spanY;
    if (!insideSuslik(x, y)) continue;
    if (i < edgeCount) {
      const onEdge =
        !insideSuslik(x + eps, y) ||
        !insideSuslik(x - eps, y) ||
        !insideSuslik(x, y + eps) ||
        !insideSuslik(x, y - eps);
      if (!onEdge) continue;
    }
    out[i * 3] = (x - 0.5) * SUSLIK_SCALE;
    out[i * 3 + 1] = (0.5 - y) * SUSLIK_SCALE; // flip: unit space is y-down
    out[i * 3 + 2] = (Math.random() - 0.5) * Z_SPREAD;
    i++;
  }
  // Guard tripped (shouldn't happen): fill the remainder anywhere inside.
  for (; i < count; i++) {
    out[i * 3] = (Math.random() - 0.5) * 0.4;
    out[i * 3 + 1] = (Math.random() - 0.5) * 1.2;
    out[i * 3 + 2] = (Math.random() - 0.5) * Z_SPREAD;
  }
  return out;
}

export function sampleGlyph(text: string, count: number): Float32Array {
  const W = 640;
  const H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return sampleSuslik(count);

  const fontFor = (px: number) =>
    `900 ${px}px Unbounded, "Arial Black", system-ui, sans-serif`;
  ctx.font = fontFor(100);
  const m = ctx.measureText(text);
  const w100 = Math.max(1, m.width);
  const h100 =
    (m.actualBoundingBoxAscent || 74) + (m.actualBoundingBoxDescent || 6);
  const size = Math.floor(
    100 * Math.min((W * 0.86) / w100, (H * 0.8) / Math.max(1, h100)),
  );

  ctx.clearRect(0, 0, W, H);
  ctx.font = fontFor(size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, W / 2, H / 2);

  const data = ctx.getImageData(0, 0, W, H).data;
  const px: number[] = []; // interleaved x,y of opaque pixels
  let bx0 = W,
    bx1 = 0,
    by0 = H,
    by1 = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] > 140) {
        px.push(x, y);
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  }
  const n = px.length / 2;
  if (n < 24) return sampleSuslik(count); // glyph failed to render

  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;
  const bw = Math.max(1, bx1 - bx0);
  const bh = Math.max(1, by1 - by0);
  // Fit the glyph into ~1.75 wide × 1.35 tall shape units, aspect preserved.
  const s = Math.min(1.75 / bw, 1.35 / bh);

  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const k = (Math.random() * n) | 0;
    const gx = px[k * 2] + Math.random() - 0.5;
    const gy = px[k * 2 + 1] + Math.random() - 0.5;
    out[i * 3] = (gx - cx) * s;
    out[i * 3 + 1] = (cy - gy) * s;
    out[i * 3 + 2] = (Math.random() - 0.5) * Z_SPREAD;
  }
  return out;
}

/** A loose spherical cloud — the "before" state of the first assembly. */
export function sampleCloud(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.4 + Math.random() * 1.3;
    out[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    out[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    out[i * 3 + 2] = r * Math.cos(phi) * 0.35;
  }
  return out;
}

export function sampleShape(shape: SceneShape, count: number): Float32Array {
  if (shape === "suslik") return sampleSuslik(count);
  return sampleGlyph(PERSONA_GLYPH[shape], count);
}
