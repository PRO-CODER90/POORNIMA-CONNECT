// Pre-renders the dashboard banner's flower-framed arch (and the edge sprays) to transparent WebP.
// Drawing hundreds of SVG petals live made the dashboard heavy (~11k DOM nodes); a picture is cheap.
// The SVG renderer used by sharp won't draw embedded photos, so the arch is built in layers:
// white backing → campus photo cut to the arch shape → outline + flowers.
// Re-run after changing HeroScene.tsx:  npx tsx scripts/render-hero-art.tsx
import sharp from 'sharp';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactElement } from 'react';
import { ArchPhoto, EdgeFlowers } from '../src/cafe/components/student/HeroScene';

const NS = '<svg xmlns="http://www.w3.org/2000/svg" ';
const svgOf = (el: ReactElement) => renderToStaticMarkup(el).replace('<svg ', NS);
const png = (svg: string, width: number) => sharp(Buffer.from(svg), { density: 300 }).resize({ width }).png().toBuffer();

async function arch(width: number, out: string) {
  const full = svgOf(createElement(ArchPhoto, { uid: 'a' }));
  const [vx, vy, vw, vh] = full.match(/viewBox="([^"]+)"/)![1].split(' ').map(Number);
  const k = width / vw;
  const height = Math.round(vh * k);
  const img = full.match(/<image [^>]*>(<\/image>)?/)![0];
  const at = (n: string) => Number(img.match(new RegExp(` ${n}="([-\\d.]+)"`))![1]);
  const archD = full.match(/<clipPath[^>]*><path d="([^"]+)"/)![1];
  const backing = full.match(/<path d="[^"]+" fill="#fff"[^>]*>(<\/path>)?/)![0];
  const top = full.replace(img, '').replace(backing, '');
  const shell = (body: string) => `${NS}viewBox="${vx} ${vy} ${vw} ${vh}">${body}</svg>`;

  const box = { left: Math.round((at('x') - vx) * k), top: Math.round((at('y') - vy) * k), width: Math.round(at('width') * k), height: Math.round(at('height') * k) };
  const photo = await sharp('public/brand/hero-campus.webp').resize({ width: box.width, height: box.height, fit: 'cover' }).toBuffer();
  const mask = await png(shell(`<path d="${archD}" fill="#fff"/>`), width);
  const photoLayer = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: photo, left: box.left, top: box.top }, { input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const info = await sharp(await png(shell(backing), width))
    .composite([{ input: photoLayer }, { input: await png(top, width) }])
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(out);
  console.log(`${out} ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`);
}

async function main() {
  await arch(1400, 'public/brand/hero-arch.webp');
  const info = await sharp(await png(svgOf(createElement(EdgeFlowers, { uid: 'e' })), 180)).webp({ quality: 82, alphaQuality: 90 }).toFile('public/brand/hero-edge.webp');
  console.log(`public/brand/hero-edge.webp ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`);
}
void main();
