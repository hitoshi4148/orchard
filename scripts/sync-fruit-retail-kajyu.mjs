/**
 * Fetches MAFF 食品価格動向調査（果樹）PDF in Node (unpdf) and writes a static snapshot
 * for Cloudflare Pages Functions (PDF.js does not bundle reliably under Wrangler).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRetailKajyuDataset } from "../src/maff-retail-kajyu/fetch.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public/portal/data/fruit-retail-kajyu.json");

const dataset = await fetchRetailKajyuDataset();
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
console.log(
  "Wrote",
  outPath,
  dataset.latest.surveyLabel,
  `history=${dataset.history.length}`
);
