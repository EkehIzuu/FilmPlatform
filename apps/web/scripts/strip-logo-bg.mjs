/**
 * Removes outer black background via flood-fill from image edges.
 * Run: node scripts/strip-logo-bg.mjs
 */
import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, "../public/izora-logo.png");
const output = join(__dirname, "../public/izora-logo-transparent.png");

const THRESHOLD = 28;

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const pixels = new Uint8Array(data);
const visited = new Uint8Array(width * height);
const queue = [];

const isBg = (x, y) => {
  const i = (y * width + x) * 4;
  return (
    pixels[i] <= THRESHOLD &&
    pixels[i + 1] <= THRESHOLD &&
    pixels[i + 2] <= THRESHOLD
  );
};

const push = (x, y) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const idx = y * width + x;
  if (visited[idx] || !isBg(x, y)) return;
  visited[idx] = 1;
  queue.push([x, y]);
};

for (let x = 0; x < width; x++) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y++) {
  push(0, y);
  push(width - 1, y);
}

while (queue.length > 0) {
  const [x, y] = queue.pop();
  const i = (y * width + x) * 4;
  pixels[i + 3] = 0;
  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(output);

console.log(`Wrote transparent logo: ${output}`);
