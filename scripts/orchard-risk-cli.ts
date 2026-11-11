/**
 * りんご・なし病害 API のローカル確認（NASA/MET 実呼び出し）
 *
 * 例:
 *   npx tsx scripts/orchard-risk-cli.ts --lat 40.82 --lon 140.74 --crop apple --bloom 2026-04-25
 *   npx tsx scripts/orchard-risk-cli.ts --lat 36.39 --lon 139.06 --crop apple --bloom 2026-04-25 --out tmp-orchard-risk.json
 */
import { writeFileSync } from "node:fs";
import {
  fetchOrchardRiskForecast,
  type OrchardRiskFetchOptions,
} from "../src/orchard-risk/forecast";
import { DISEASE_DISPLAY_NAME } from "../src/orchard-risk/catalog";
import type { OrchardCropId } from "../src/orchard-risk/types";

function usage(): never {
  console.error(`Usage: orchard-risk-cli --lat <num> --lon <num> [--crop apple|nashi] [--variety 名]
       [--growth_stage youngfruit] [--bloom YYYY-MM-DD] [--no-marssonina-onset] [--out path.json] [--quiet]`);
  process.exit(1);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const lat = parseFloat(arg("lat") ?? "");
  const lon = parseFloat(arg("lon") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) usage();

  const crop = (arg("crop") === "nashi" ? "nashi" : "apple") as OrchardCropId;
  const variety =
    arg("variety")?.trim() ||
    (crop === "nashi" ? "幸水" : "ふじ");
  const growthStage = arg("growth_stage")?.trim() || "youngfruit";
  const bloom = arg("bloom")?.trim() || null;
  if (crop === "apple" && bloom && !/^\d{4}-\d{2}-\d{2}$/.test(bloom)) {
    console.error("Invalid --bloom (YYYY-MM-DD)");
    process.exit(1);
  }

  const options: OrchardRiskFetchOptions = {};
  if (hasFlag("no-marssonina-onset")) {
    options.includeMarssoninaOnset = false;
  }

  const forecast = await fetchOrchardRiskForecast(
    lat,
    lon,
    crop,
    variety,
    growthStage,
    crop === "apple" ? bloom : null,
    options
  );

  const outPath = arg("out");
  if (outPath) {
    writeFileSync(outPath, JSON.stringify({ success: true, forecast }, null, 2), "utf8");
    console.error(`Wrote ${outPath}`);
  }

  if (hasFlag("quiet") && outPath) {
    return;
  }

  console.log(`${forecast.dataSourceLabel}`);
  console.log(`更新: ${forecast.updatedAt}  品種: ${forecast.variety} (×${forecast.varietyFactor})`);
  console.log("--- 発病予測（onset）---");
  for (const row of forecast.onset) {
    const name = DISEASE_DISPLAY_NAME[row.diseaseId] ?? row.diseaseId;
    const status = row.marssoninaStatus ? ` [${row.marssoninaStatus}]` : "";
    console.log(
      `${name}: 感染推定=${row.estimatedInfectionDate}  発病窓=${row.predictedOnsetWindow}  信頼=${row.confidence}${status}`
    );
    if (row.note) {
      const short =
        row.note.length > 120 ? `${row.note.slice(0, 120)}…` : row.note;
      console.log(`  ${short}`);
    }
  }
  console.log("--- 6日感染レベル（0=本日）---");
  for (const [id, levels] of Object.entries(forecast.infectionByDiseaseId)) {
    const name = DISEASE_DISPLAY_NAME[id] ?? id;
    const demo = forecast.demoDiseaseIds.includes(id) ? " (簡易)" : "";
    console.log(`${name}${demo}: ${levels.join(" → ")}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
