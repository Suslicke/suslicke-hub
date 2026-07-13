#!/usr/bin/env node
/**
 * Bakes the QR bit-matrix for the hero 3D scene (and its static SVG fallback)
 * into public/qr-matrix.json at build time.
 *
 * The matrix encodes https://suslicke.com/qr at error-correction level H so
 * the voxel QR in the hero stays scannable even with mild visual noise.
 *
 * Output shape: { "size": N, "modules": number[] } where modules is the
 * row-major N*N bit matrix (1 = dark module).
 *
 * Run: pnpm gen:qr   (or: node scripts/gen-qr.mjs)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const QR_URL = "https://suslicke.com/qr";

const qr = QRCode.create(QR_URL, { errorCorrectionLevel: "H" });
const size = qr.modules.size;
const modules = Array.from(qr.modules.data, (bit) => (bit ? 1 : 0));

if (modules.length !== size * size) {
  throw new Error(`Matrix length ${modules.length} !== ${size}*${size}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public", "qr-matrix.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ size, modules }));

const darkCount = modules.reduce((a, b) => a + b, 0);
console.log(
  `qr-matrix.json: ${size}x${size} (${darkCount} dark modules) for ${QR_URL}`,
);
