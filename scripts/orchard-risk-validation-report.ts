/**
 * りんご・なし病害リスク — 検証レポート自動生成
 *
 *   npm run report:orchard-risk-validation
 *   npm run report:orchard-risk-validation -- --no-live-api
 *
 * 出力: reports/orchard-risk/output/<ISO日時>/validation.{json,md}
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../src/disease/nasa-power";
import { buildMarssoninaGddReportSummary } from "../src/orchard-risk/marssonina-gdd-report";
import {
  filterHourlyForExploration,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "../src/orchard-risk/marssonina-infection";
import { fetchOrchardRiskForecast } from "../src/orchard-risk/forecast";
import { jstTodayString, addDaysToDateString } from "../src/disease/met-norway-forecast";
import {
  MARSSONINA_GOLDEN_EXPECTATIONS,
  MARSSONINA_GOLDEN_WINDOW,
  VALIDATION_SITES,
} from "../src/orchard-risk/validation-golden";

const OUT_ROOT = join(process.cwd(), "reports", "orchard-risk", "output");

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function runUnitTests(): { ok: boolean; summary: string } {
  try {
    const out = execSync("npm run test:marssonina", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const m = out.match(/# pass (\d+)/);
    const pass = m ? Number(m[1]) : 0;
    const fail = out.includes("# fail 0") ? 0 : 1;
    return {
      ok: fail === 0,
      summary: `marssonina unit: pass ${pass}, fail ${fail}`,
    };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return {
      ok: false,
      summary: `marssonina unit: FAILED\n${err.stderr ?? err.stdout ?? ""}`.slice(
        0,
        2000
      ),
    };
  }
}

async function marssoninaGoldenForSite(site: (typeof VALIDATION_SITES)[0]) {
  const { bloomStart, explorationEnd, evaluateThrough } =
    MARSSONINA_GOLDEN_WINDOW;
  const win = resolveMarssoninaNasaWindow(bloomStart, explorationEnd);
  const raw = await fetchNasaPowerHourly(
    site.lat,
    site.lon,
    win.nasaApiStart,
    win.nasaApiEnd,
    { timeStandard: "UTC" }
  );
  const hourly = filterHourlyForExploration(raw, bloomStart, explorationEnd);
  const search = searchPrimaryMarssoninaInfection(raw, win, false, "phase2");
  const primary = search.primary?.infectionDate ?? null;
  let gdd159: string | null = null;
  let gddSummary = null as ReturnType<
    typeof buildMarssoninaGddReportSummary
  > | null;
  if (primary) {
    const daily = await fetchNasaPowerDaily(
      site.lat,
      site.lon,
      primary,
      explorationEnd
    );
    gddSummary = buildMarssoninaGddReportSummary(
      primary,
      daily,
      [],
      explorationEnd,
      evaluateThrough
    );
    gdd159 = gddSummary.estimatedOnsetDate;
  }

  const expected = MARSSONINA_GOLDEN_EXPECTATIONS[site.id];
  const primaryOk = primary === expected.primaryInfectionDate;
  const gddOk = gdd159 === expected.gdd159OnsetDate;

  return {
    siteId: site.id,
    label: site.label,
    lat: site.lat,
    lon: site.lon,
    marssoninaStatus: search.marssoninaStatus,
    coverage: search.coverage,
    hourlyExplored: hourly.length,
    primaryInfectionDate: primary,
    gdd159OnsetDate: gdd159,
    golden: expected,
    checks: {
      primaryInfectionDate: primaryOk,
      gdd159OnsetDate: gddOk,
      pass: primaryOk && gddOk,
    },
    gddSummary,
  };
}

async function liveApiSnapshot(site: (typeof VALIDATION_SITES)[0]) {
  const bloom = MARSSONINA_GOLDEN_WINDOW.bloomStart;
  const t0 = Date.now();
  const apple = await fetchOrchardRiskForecast(
    site.lat,
    site.lon,
    "apple",
    "ふじ",
    "youngfruit",
    bloom,
    { includeMarssoninaOnset: true }
  );
  const appleMs = Date.now() - t0;

  const t1 = Date.now();
  const nashi = await fetchOrchardRiskForecast(
    site.lat,
    site.lon,
    "nashi",
    "幸水",
    "youngfruit",
    null
  );
  const nashiMs = Date.now() - t1;

  const marssoninaOnset = apple.onset.find((r) => r.diseaseId === "apple:marssonina");
  const scabLevels = apple.infectionByDiseaseId["apple:scab"];
  const marssoninaLevels = apple.infectionByDiseaseId["apple:marssonina"];

  return {
    siteId: site.id,
    appleFetchMs: appleMs,
    nashiFetchMs: nashiMs,
    appleUpdatedAt: apple.updatedAt,
    marssoninaOnsetStatus: marssoninaOnset?.marssoninaStatus ?? null,
    marssoninaPrimary: marssoninaOnset?.estimatedInfectionDate ?? null,
    marssoninaOnsetWindow: marssoninaOnset?.predictedOnsetWindow ?? null,
    scabLevels6d: scabLevels,
    marssoninaLevels6d: marssoninaLevels,
    nashiScabLevels6d: nashi.infectionByDiseaseId["nashi:scab"],
    demoDiseaseCount: apple.demoDiseaseIds.length,
  };
}

function stampDir(): string {
  const iso = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return join(OUT_ROOT, iso);
}

function renderMarkdown(report: Record<string, unknown>): string {
  const lines: string[] = [
    "# りんご・なし病害リスク — 検証レポート",
    "",
    `- 生成: ${report.generatedAt}`,
    `- JST 今日: ${report.jstToday}`,
    "",
    "## ユニットテスト",
    "",
    `- ${report.unitTestsSummary}`,
    `- 結果: **${report.unitTestsOk ? "PASS" : "FAIL"}**`,
    "",
    "## 褐斑ゴールデン（固定窓）",
    "",
    `- 開花始期: ${MARSSONINA_GOLDEN_WINDOW.bloomStart}`,
    `- 探索終了: ${MARSSONINA_GOLDEN_WINDOW.explorationEnd}`,
    "",
  ];

  const golden = report.golden as Record<string, unknown>[];
  let allPass = report.unitTestsOk === true;
  for (const row of golden) {
    const c = row.checks as { pass: boolean };
    allPass &&= c.pass;
    lines.push(
      `### ${row.label} (${row.siteId})`,
      "",
      `| 項目 | 期待 | 実測 | OK |`,
      `|------|------|------|-----|`,
      `| 一次感染日 | ${(row.golden as { primaryInfectionDate: string }).primaryInfectionDate} | ${row.primaryInfectionDate ?? "—"} | ${(row.checks as { primaryInfectionDate: boolean }).primaryInfectionDate ? "✓" : "✗"} |`,
      `| GDD159 発病 | ${(row.golden as { gdd159OnsetDate: string }).gdd159OnsetDate} | ${row.gdd159OnsetDate ?? "—"} | ${(row.checks as { gdd159OnsetDate: boolean }).gdd159OnsetDate ? "✓" : "✗"} |`,
      "",
      `- 状態: \`${row.marssoninaStatus}\` / coverage: \`${row.coverage}\``,
      ""
    );
  }

  lines.push(
    `**ゴールデン総合: ${allPass ? "PASS" : "FAIL"}**`,
    ""
  );

  if (report.liveApi) {
    lines.push("## ライブ API スナップショット（`fetchOrchardRiskForecast`）", "");
    for (const snap of report.liveApi as Record<string, unknown>[]) {
      lines.push(
        `### ${snap.siteId}`,
        `- apple 取得 ${snap.appleFetchMs} ms / nashi ${snap.nashiFetchMs} ms`,
        `- 褐斑 onset: \`${snap.marssoninaOnsetStatus}\` / 一次 ${snap.marssoninaPrimary} / 窓 ${snap.marssoninaOnsetWindow}`,
        `- 黒星6日: ${JSON.stringify(snap.scabLevels6d)}`,
        `- 褐斑6日: ${JSON.stringify(snap.marssoninaLevels6d)}`,
        ""
      );
    }
  }

  lines.push(
    "## 参照",
    "",
    "- コマンド: `npm run report:orchard-risk-validation`",
    "- なし黒星 Duthie 調査: `docs/nashi-scab-duthie-research.md`",
    ""
  );

  return lines.join("\n");
}

async function main() {
  const skipLive = argFlag("no-live-api");
  const unit = runUnitTests();

  const golden: Awaited<ReturnType<typeof marssoninaGoldenForSite>>[] = [];
  for (const site of VALIDATION_SITES) {
    golden.push(await marssoninaGoldenForSite(site));
  }

  let liveApi: Awaited<ReturnType<typeof liveApiSnapshot>>[] | null = null;
  if (!skipLive) {
    liveApi = [];
    for (const site of VALIDATION_SITES) {
      liveApi.push(await liveApiSnapshot(site));
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    jstToday: jstTodayString(),
    explorationEndLive: addDaysToDateString(jstTodayString(), -1),
    unitTestsOk: unit.ok,
    unitTestsSummary: unit.summary,
    golden,
    liveApi,
  };

  const dir = stampDir();
  mkdirSync(dir, { recursive: true });
  const jsonPath = join(dir, "validation.json");
  const mdPath = join(dir, "validation.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  writeFileSync(mdPath, renderMarkdown(report), "utf8");

  const goldenPass = golden.every((g) => g.checks.pass);
  console.log(renderMarkdown(report));
  console.log(`\nWrote:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(
    `\nSummary: unit=${unit.ok ? "PASS" : "FAIL"} golden=${goldenPass ? "PASS" : "FAIL"}`
  );

  if (!unit.ok || !goldenPass) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
