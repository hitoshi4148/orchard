/**
 * Phase 1 比較レポート（弘前・デフォルト）
 * npx tsx scripts/marssonina-phase1-compare.ts
 */
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../src/disease/nasa-power";
import { computeMarssoninaGddEstimate } from "../src/orchard-risk/marssonina-gdd";
import {
  filterHourlyForExploration,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "../src/orchard-risk/marssonina-infection";
import { listQualifyingMarssoninaPrecipDays } from "../src/orchard-risk/marssonina-precip-day";

const BLOOM = "2026-04-25";
const END = "2026-11-08";
const LEGACY_A = { hirosaki: "2026-05-25", default: "2026-05-08" };

const SITES = [
  { name: "弘前", lat: 40.82, lon: 140.74, legacyA: LEGACY_A.hirosaki },
  { name: "群馬・前橋", lat: 36.39, lon: 139.06, legacyA: LEGACY_A.default },
];

async function main() {
  const report: Record<string, unknown> = { bloom: BLOOM, end: END, sites: {} };

  for (const site of SITES) {
    const win = resolveMarssoninaNasaWindow(BLOOM, END);
    const raw = await fetchNasaPowerHourly(
      site.lat,
      site.lon,
      win.nasaApiStart,
      win.nasaApiEnd,
      { timeStandard: "UTC" }
    );
    const hourly = filterHourlyForExploration(raw, BLOOM, END);
    const search = searchPrimaryMarssoninaInfection(raw, win, false);
    const primary = search.primary;
    let p3 = null;
    if (primary) {
      const daily = await fetchNasaPowerDaily(
        site.lat,
        site.lon,
        primary.infectionDate,
        END
      );
      p3 = computeMarssoninaGddEstimate(
        primary.infectionDate,
        daily,
        [],
        END,
        "2026-11-09"
      );
    }
    const firstThree = listQualifyingMarssoninaPrecipDays(hourly, BLOOM, END).slice(
      0,
      3
    );

    (report.sites as Record<string, unknown>)[site.name] = {
      lat: site.lat,
      lon: site.lon,
      status: search.marssoninaStatus,
      candidateCount: search.candidateCount,
      legacyA_primaryDate: site.legacyA,
      primary: primary
        ? {
            infectionDate: primary.infectionDate,
            periodStart: primary.periodStart,
            periodEnd: primary.periodEnd,
            wetDurationHours: primary.wetDurationHours,
            wetAvgTempC: primary.wetAvgTempC,
            precipWetHourCount: primary.precipWetHourCount,
            missingHourCount: primary.missingHourCount,
          }
        : null,
      deltaFromLegacyA_days: primary
        ? Math.round(
            (Date.parse(primary.infectionDate) - Date.parse(site.legacyA)) /
              (24 * 60 * 60 * 1000)
          )
        : null,
      p3_onsetDate: p3?.estimatedOnsetDate ?? null,
      p3_measuredGdd: p3?.measuredGddDayC ?? null,
      firstQualifyingDays: firstThree.map((d) => ({
        day: d.precipDay,
        wetH: d.wetDurationHours,
        avg: d.wetAvgTempC,
      })),
    };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
