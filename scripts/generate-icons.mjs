/**
 * Genera los íconos PNG de la PWA a partir de un SVG.
 * Uso: node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "icons");

const svg = (maskable) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f9d7de"/>
      <stop offset="55%" stop-color="#f3c6d1"/>
      <stop offset="100%" stop-color="#bde8d5"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#bg)"/>
  <circle cx="132" cy="112" r="120" fill="url(#shine)" opacity="0.55"/>
  <circle cx="420" cy="424" r="150" fill="#ffffff" opacity="0.18"/>
  ${
    maskable
      ? ""
      : `<rect x="34" y="34" width="444" height="444" rx="88" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="10"/>`
  }
  <g transform="translate(256 258)">
    <path d="M-128 -6 L0 -66 L128 -6 L0 54 Z" fill="#ffffff" opacity="0.96"/>
    <path d="M-128 -6 L-128 58 C-84 88 84 88 128 58 L128 -6 L0 54 Z" fill="#ffffff" opacity="0.82"/>
    <path d="M0 54 L0 118" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.9"/>
    <circle cx="0" cy="132" r="15" fill="#ffffff" opacity="0.9"/>
    <path d="M128 -6 L128 76" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.7"/>
    <circle cx="128" cy="92" r="18" fill="#ffffff" opacity="0.92"/>
  </g>
</svg>`;

async function render(size, name) {
  const buffer = Buffer.from(svg(false));
  await sharp(buffer).resize(size, size).png().toFile(path.join(outDir, name));
  return name;
}

async function renderMaskable(size, name) {
  const buffer = Buffer.from(svg(true));
  await sharp(buffer).resize(size, size).png().toFile(path.join(outDir, name));
  return name;
}

await mkdir(outDir, { recursive: true });
await Promise.all([
  render(192, "icon-192.png"),
  render(512, "icon-512.png"),
  renderMaskable(512, "icon-maskable-512.png"),
  render(180, "apple-touch-icon.png"),
  render(32, "favicon-32.png"),
]);
await writeFile(path.join(outDir, "..", "favicon.svg"), svg(false));
console.log("Íconos generados en public/icons");
