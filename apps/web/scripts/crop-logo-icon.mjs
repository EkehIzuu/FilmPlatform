/**
 * Crops only the circular mark — excludes the IZORA wordmark below.
 * Run: node scripts/crop-logo-icon.mjs
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, "../public/izora-logo-transparent.png");
const output = join(__dirname, "../public/izora-icon.png");

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: w, height: h } = info;

/** First row where wide text band starts (full wordmark). */
let textRowY = h;
for (let y = 0; y < h; y++) {
  let left = w;
  let right = 0;
  let count = 0;
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 30 && data[i] + data[i + 1] + data[i + 2] > 50) {
      count++;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (count > 0 && right - left > 500 && y > 400) {
    textRowY = y;
    break;
  }
}

let minX = w;
let minY = h;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < textRowY; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 30 && data[i] + data[i + 1] + data[i + 2] > 50) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const pad = 12;
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const width = Math.min(w - left, maxX - minX + pad * 2);
const height = Math.min(h - top, maxY - minY + pad * 2);

await sharp(input).extract({ left, top, width, height }).trim().png().toFile(output);

console.log(`Icon crop: ${width}x${height} (text starts at y=${textRowY})`);
console.log(`Wrote ${output}`);
