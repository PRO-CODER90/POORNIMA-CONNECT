// Renders the neutral "Demo image" placeholders for menu items (one per category + packets).
// Plain shapes on a theme gradient: no photos, no brands. Re-run: node scripts/make-demo-images.mjs
import sharp from "sharp";

const OUT = new URL("../public/images/menu/demo/", import.meta.url);
const ink = "#1e3a8a";
const line = `fill="none" stroke="${ink}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"`;

const shapes = {
  snacks: { from: "#fff4e0", to: "#ffe1c2", art: `<path ${line} d="M260 520 L400 250 L540 520 Z"/><path ${line} d="M330 430 h140"/>` },
  beverages: { from: "#e6f4ff", to: "#cfe6ff", art: `<path ${line} d="M290 300 h220 l-24 250 a30 30 0 0 1-30 26 h-112 a30 30 0 0 1-30-26 Z"/><path ${line} d="M510 350 h28 a40 40 0 0 1 0 80 h-36"/><path ${line} d="M350 250 q20-30 0-60 M420 250 q20-30 0-60"/>` },
  "fast-food": { from: "#fff0e6", to: "#ffd9c7", art: `<path ${line} d="M260 400 a140 110 0 0 1 280 0 Z"/><path ${line} d="M250 445 h300"/><path ${line} d="M260 490 h280 a20 20 0 0 1-20 40 h-240 a20 20 0 0 1-20-40 Z"/>` },
  meals: { from: "#eaf7ee", to: "#d2efdc", art: `<circle cx="400" cy="420" r="170" ${line}/><circle cx="400" cy="420" r="105" ${line}/><path ${line} d="M180 280 v260 M610 280 v260"/>` },
  desserts: { from: "#fdeef6", to: "#f8d6e8", art: `<path ${line} d="M320 400 L400 600 L480 400"/><path ${line} d="M300 400 a100 100 0 0 1 200 0 Z"/><circle cx="400" cy="250" r="18" fill="${ink}"/>` },
  packet: { from: "#f0edff", to: "#ddd6ff", art: `<path ${line} d="M290 230 h220 l-20 40 l20 40 v220 l-20 40 l20 40 h-220 l20-40 l-20-40 v-220 l20-40 Z" transform="translate(0,-20) scale(1,0.92)"/><path ${line} d="M330 380 h140 M330 430 h100"/>` },
};

for (const [name, s] of Object.entries(shapes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.from}"/><stop offset="1" stop-color="${s.to}"/></linearGradient></defs>
  <rect width="800" height="800" fill="url(#g)"/>
  <circle cx="400" cy="400" r="290" fill="#ffffff" fill-opacity="0.55"/>
  <g opacity="0.85">${s.art}</g>
  <text x="400" y="740" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" letter-spacing="8" fill="${ink}" fill-opacity="0.55">DEMO IMAGE</text>
</svg>`;
  const file = new URL(`${name}.webp`, OUT);
  const info = await sharp(Buffer.from(svg)).webp({ quality: 78 }).toFile(file.pathname);
  console.log(`${name}.webp ${Math.round(info.size / 1024)} KB`);
}
