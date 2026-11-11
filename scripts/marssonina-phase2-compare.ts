/**
 * Phase 1 vs Phase 2 比較（弘前・デフォルト）
 * npx tsx scripts/marssonina-phase2-compare.ts
 */
import { writeFileSync } from "node:fs";
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../src/disease/nasa-power";
import { buildMarssoninaGddReportSummary } from "../src/orchard-risk/marssonina-gdd-report";
import {
  filterHourlyForExploration,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "../src/orchard-risk/marssonina-infection";
import {
  listMarssoninaPrecipDayStats,
  listQualifyingMarssoninaPrecipDays,
} from "../src/orchard-risk/marssonina-precip-day";

const BLOOM = "2026-04-25";
const END = "2026-11-08";

const SITES = [
  { id: "hirosaki", label: "弘前", lat: 40.82, lon: 140.74 },
  { id: "maebashi", label: "群馬・前橋", lat: 36.39, lon: 139.06 },
];

const TODAY = "2026-11-09";

async function gddSummary(lat: number, lon: number, primaryDate: string) {
  const daily = await fetchNasaPowerDaily(lat, lon, primaryDate, END);
  return buildMarssoninaGddReportSummary(
    primaryDate,
    daily,
    [],
    END,
    TODAY
  );
}

async function compareSite(site: (typeof SITES)[0]) {
  const win = resolveMarssoninaNasaWindow(BLOOM, END);
  const raw = await fetchNasaPowerHourly(
    site.lat,
    site.lon,
    win.nasaApiStart,
    win.nasaApiEnd,
    { timeStandard: "UTC" }
  );
  const hourly = filterHourlyForExploration(raw, BLOOM, END);
  const p1Search = searchPrimaryMarssoninaInfection(raw, win, false, "phase1");
  const p2Search = searchPrimaryMarssoninaInfection(raw, win, false, "phase2");

  const p1Qual = listQualifyingMarssoninaPrecipDays(hourly, BLOOM, END, "phase1");
  const p2Qual = listQualifyingMarssoninaPrecipDays(hourly, BLOOM, END, "phase2");
  const p1Set = new Set(p1Qual.map((d) => d.precipDay));
  const newlyQualifying = p2Qual.filter((d) => !p1Set.has(d.precipDay));

  const primaryP1 = p1Search.primary?.infectionDate ?? null;
  const primaryP2 = p2Search.primary?.infectionDate ?? null;

  const p1Gdd = primaryP1 ? await gddSummary(site.lat, site.lon, primaryP1) : null;
  const p2Gdd = primaryP2 ? await gddSummary(site.lat, site.lon, primaryP2) : null;

  const statsCompare = (date: string) => {
    const s1 = listMarssoninaPrecipDayStats(hourly, date, date, "phase1")[0];
    const s2 = listMarssoninaPrecipDayStats(hourly, date, date, "phase2")[0];
    return {
      date,
      phase1: s1
        ? {
            wetDurationHours: s1.wetDurationHours,
            wetAvgTempC: s1.wetAvgTempC,
            qualifies: s1.qualifies,
            missingHourCount: s1.missingHourCount,
            incomplete: s1.incomplete,
          }
        : null,
      phase2: s2
        ? {
            wetDurationHours: s2.wetDurationHours,
            wetAvgTempC: s2.wetAvgTempC,
            extensionWetHourCount: s2.extensionWetHourCount,
            qualifies: s2.qualifies,
            missingHourCount: s2.missingHourCount,
            incomplete: s2.incomplete,
          }
        : null,
    };
  };

  const focusDates = new Set<string>();
  if (primaryP1) focusDates.add(primaryP1);
  if (primaryP2) focusDates.add(primaryP2);
  for (const d of newlyQualifying.slice(0, 5)) focusDates.add(d.precipDay);

  return {
    site: site.label,
    lat: site.lat,
    lon: site.lon,
    coverage: p2Search.coverage,
    primaryInfectionDate: { phase1: primaryP1, phase2: primaryP2 },
  gdd159: { phase1: p1Gdd, phase2: p2Gdd },
    candidateCount: { phase1: p1Qual.length, phase2: p2Qual.length },
    primaryDetail: {
      phase1: p1Search.primary,
      phase2: p2Search.primary,
    },
    newlyQualifyingPhase2: newlyQualifying.map((d) => ({
      precipDay: d.precipDay,
      wetDurationHours: d.wetDurationHours,
      wetAvgTempC: d.wetAvgTempC,
      extensionWetHourCount: d.extensionWetHourCount,
      missingHourCount: d.missingHourCount,
    })),
    dayComparison: [...focusDates].sort().map(statsCompare),
  };
}

async function main() {
  const report: Record<string, unknown> = {
    bloom: BLOOM,
    end: END,
    wetnessRule:
      "phase2: suzuki extension via Chiba2015 summary (Suzuki2003 PDF not verified)",
    sites: {} as Record<string, unknown>,
  };
  for (const site of SITES) {
    report.sites[site.id] = await compareSite(site);
  }
  const json = JSON.stringify(report, null, 2);
  const outDir = "C:/Users/hitos/Documents/2026/202611/20261110";
  const jsonPath = `${outDir}/marssonina-phase2-compare-result.json`;
  writeFileSync(jsonPath, json, "utf8");

  const mdLines = [
    "# Phase 1 vs Phase 2 比較（再出力）",
    "",
    `- 開花: ${BLOOM} / 探索終了: ${END}`,
    "",
  ];
  for (const site of SITES) {
    const s = report.sites[site.id] as Record<string, unknown>;
    mdLines.push(`## ${s.site}`);
    mdLines.push("");
    mdLines.push(
      `- 一次感染: P1 ${JSON.stringify((s.primaryInfectionDate as Record<string, string>).phase1)} / P2 ${JSON.stringify((s.primaryInfectionDate as Record<string, string>).phase2)}`
    );
    const gdd = s.gdd159 as { phase1: Record<string, unknown>; phase2: Record<string, unknown> };
    for (const phase of ["phase1", "phase2"] as const) {
      const g = gdd[phase];
      if (!g) continue;
      mdLines.push(`### GDD (${phase})`);
      mdLines.push(
        `- 到達: ${g.thresholdReachedInMeasured ? "はい" : "いいえ"}`,
        `- 到達日: ${g.estimatedOnsetDate ?? "—"}`,
        `- 累積（実測）: ${g.measuredGddDayC} 日℃`,
        `- 欠測日: ${(g.missingDailyDates as string[]).join(", ") || "なし"}`,
        `- 到達前欠測: ${(g.missingBeforeOnsetDates as string[]).join(", ") || "なし"}`,
        g.dataQualityNote ? `- 注記: ${g.dataQualityNote}` : ""
      );
      mdLines.push("");
    }
  }
  writeFileSync(`${outDir}/marssonina-phase2-compare-report.md`, mdLines.join("\n"), "utf8");

  console.log(json);
  console.log("\nWrote", jsonPath);
  console.log("Wrote", `${outDir}/marssonina-phase2-compare-report.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
