import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = join(root, "public/portal/shigoto-title-logo.png");
const output = join(root, "public/portal/shigoto-title-logo-transparent.png");

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r > 240 && g > 240 && b > 240) {
    data[i + 3] = 0;
  }
}
await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(output);
console.log(`Wrote ${output}`);