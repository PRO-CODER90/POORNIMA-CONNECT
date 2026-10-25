// Converts source photos in design-assets/ to the WebP files served from public/.
// next/image then serves smaller sizes per device. Re-run: node scripts/optimize-images.mjs
import sharp from "sharp";

const jobs = [{ src: "design-assets/campus.jpg", out: "public/campus.webp", width: 1600, quality: 66 }];

for (const j of jobs) {
  const info = await sharp(j.src).resize({ width: j.width, withoutEnlargement: true }).webp({ quality: j.quality }).toFile(j.out);
  console.log(`${j.out} ${Math.round(info.size / 1024)} KB ${info.width}x${info.height}`);
}
