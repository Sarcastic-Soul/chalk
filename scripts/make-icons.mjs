// Builds the app icons from one SVG. Run: node scripts/make-icons.mjs
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
// sharp ships with Next; load it from the pnpm store so it needs no extra install.
const dir = readdirSync("node_modules/.pnpm").find((d) => d.startsWith("sharp@"));
const sharp = createRequire(import.meta.url)(`../node_modules/.pnpm/${dir}/node_modules/sharp`);

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#1f1c18"/>
  <text x="256" y="${pad ? 330 : 352}" text-anchor="middle" font-family="DejaVu Serif" font-style="italic" font-weight="bold" font-size="${pad ? 260 : 340}" fill="#f1ede4">C</text>
  <path d="M${pad ? 170 : 130} ${pad ? 372 : 404} q86 -22 ${pad ? 172 : 252} -6" stroke="#c2512f" stroke-width="${pad ? 18 : 24}" stroke-linecap="round" fill="none"/>
</svg>`;

const out = [
  ["src/app/icon.png", 64, false],
  ["src/app/apple-icon.png", 180, true],
  ["public/icon-192.png", 192, false],
  ["public/icon-512.png", 512, false],
  ["public/icon-maskable-512.png", 512, true],
];
for (const [file, size, pad] of out) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(file);
  console.log(file, size);
}
