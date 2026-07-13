/**
 * Suslik (gopher) mascot silhouette — pure math, no DOM.
 *
 * The silhouette is a union of analytic primitives (ellipses + capsules
 * with varying radius) in a normalized unit space: x, y in [0, 1], y DOWN
 * (canvas convention), total height = 1. A standing-column pose: round
 * head with two ears on top (~1/3 of the height), a teardrop body that
 * widens into haunches, small feet at the base and a curved tail on the
 * right.
 *
 * Shared by:
 *  - shapes.ts        → rejection-samples particle targets from inside()
 *  - scene-mount.tsx  → renders the same primitives as SVG for the static
 *                       no-WebGL / reduced-motion poster
 *  - a node preview script (ASCII density matrix) used to tune proportions.
 *
 * Keep this module DOM-free and erasable-TS-only so `node
 * --experimental-strip-types` can import it directly.
 */

export type ShapePrimitive =
  | {
      kind: "ellipse";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      /** rotation in radians, clockwise (y-down space) */
      rot?: number;
    }
  | {
      kind: "capsule";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      /** radius at (x1,y1) */
      r1: number;
      /** radius at (x2,y2) */
      r2: number;
    };

/**
 * The mascot, tuned against an ASCII density preview. Order only matters
 * for the SVG poster (painted back-to-front, same fill so it's cosmetic).
 */
export const SUSLIK_PARTS: ShapePrimitive[] = [
  // ears — slightly tilted outward
  { kind: "ellipse", cx: 0.408, cy: 0.07, rx: 0.046, ry: 0.066, rot: -0.38 },
  { kind: "ellipse", cx: 0.592, cy: 0.07, rx: 0.046, ry: 0.066, rot: 0.38 },
  // head + cheeks (cheeks widen the lower half of the head)
  { kind: "ellipse", cx: 0.5, cy: 0.175, rx: 0.128, ry: 0.118 },
  { kind: "ellipse", cx: 0.5, cy: 0.228, rx: 0.142, ry: 0.082 },
  // neck→belly: capsule that widens downward (tall standing column)
  { kind: "capsule", x1: 0.5, y1: 0.345, x2: 0.5, y2: 0.72, r1: 0.09, r2: 0.148 },
  // chest bump — front paws held together at the chest
  { kind: "ellipse", cx: 0.5, cy: 0.42, rx: 0.112, ry: 0.06 },
  // haunches
  { kind: "ellipse", cx: 0.5, cy: 0.8, rx: 0.178, ry: 0.135 },
  // feet poking out at the base
  { kind: "ellipse", cx: 0.408, cy: 0.928, rx: 0.062, ry: 0.034 },
  { kind: "ellipse", cx: 0.592, cy: 0.928, rx: 0.062, ry: 0.034 },
  // tail: two capsule segments curving up on the right, thicker tip
  { kind: "capsule", x1: 0.638, y1: 0.9, x2: 0.735, y2: 0.795, r1: 0.026, r2: 0.04 },
  { kind: "capsule", x1: 0.735, y1: 0.795, x2: 0.762, y2: 0.665, r1: 0.04, r2: 0.052 },
];

/** Loose bounding box of the silhouette in unit space (for samplers). */
export const SUSLIK_BBOX = { minX: 0.24, maxX: 0.84, minY: 0.0, maxY: 0.98 };

function insideEllipse(
  px: number,
  py: number,
  e: Extract<ShapePrimitive, { kind: "ellipse" }>,
): boolean {
  let dx = px - e.cx;
  let dy = py - e.cy;
  if (e.rot) {
    const c = Math.cos(-e.rot);
    const s = Math.sin(-e.rot);
    const rx = dx * c - dy * s;
    const ry = dx * s + dy * c;
    dx = rx;
    dy = ry;
  }
  const nx = dx / e.rx;
  const ny = dy / e.ry;
  return nx * nx + ny * ny <= 1;
}

function insideCapsule(
  px: number,
  py: number,
  cap: Extract<ShapePrimitive, { kind: "capsule" }>,
): boolean {
  const vx = cap.x2 - cap.x1;
  const vy = cap.y2 - cap.y1;
  const wx = px - cap.x1;
  const wy = py - cap.y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
  const dx = wx - vx * t;
  const dy = wy - vy * t;
  const r = cap.r1 + (cap.r2 - cap.r1) * t;
  return dx * dx + dy * dy <= r * r;
}

/** Point-in-silhouette test in unit space (x,y in [0,1], y down). */
export function insideSuslik(x: number, y: number): boolean {
  for (const p of SUSLIK_PARTS) {
    if (p.kind === "ellipse") {
      if (insideEllipse(x, y, p)) return true;
    } else if (insideCapsule(x, y, p)) {
      return true;
    }
  }
  return false;
}
