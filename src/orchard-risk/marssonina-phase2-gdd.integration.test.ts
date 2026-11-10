import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../disease/nasa-power";
import {
  assertGddEstimateApiShape,
  buildMarssoninaGddReportSummary,
} from "./marssonina-gdd-report";
import { computeMarssoninaGddEstimate } from "./marssonina-gdd";
import {
  filterHourlyForExploration,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "./marssonina-infection";
import { DailyWeatherRecord } from "../disease/nasa-power";

const BLOOM = "2026-04-25";
const END = "2026-11-08";
const TODAY = "2026-11-09";

describe("marssonina Phase1/2 + GDD report (NASA)", () => {
  it(
    "Hirosaki — Phase1 GDD159 onset 2026-06-11, Phase2 onset 2026-06-07",
    { timeout: 120_000 },
    async () => {
      const win = resolveMarssoninaNasaWindow(BLOOM, END);
      const raw = await fetchNasaPowerHourly(
        40.82,
        140.74,
        win.nasaApiStart,
        win.nasaApiEnd,
        { timeStandard: "UTC" }
      );
      const p1 = searchPrimaryMarssoninaInfection(raw, win, false, "phase1");
      const p2 = searchPrimaryMarssoninaInfection(raw, win, false, "phase2");
      assert.equal(p1.primary?.infectionDate, "2026-05-28");
      assert.equal(p2.primary?.infectionDate, "2026-05-24");

      const gdd1 = await gddForPrimary(40.82, 140.74, p1.primary!.infectionDate);
      const gdd2 = await gddForPrimary(40.82, 140.74, p2.primary!.infectionDate);

      assert.equal(gdd1.thresholdReachedInMeasured, true);
      assert.equal(gdd1.estimatedOnsetDate, "2026-06-11");
      assert.equal(gdd2.thresholdReachedInMeasured, true);
      assert.equal(gdd2.estimatedOnsetDate, "2026-06-07");
      assertGddFieldsFromCompute(p1.primary!.infectionDate);
    }
  );

  it(
    "Default — Phase1 and Phase2 GDD159 onset 2026-06-05",
    { timeout: 120_000 },
    async () => {
      const win = resolveMarssoninaNasaWindow(BLOOM, END);
      const raw = await fetchNasaPowerHourly(
        36.39,
        139.06,
        win.nasaApiStart,
        win.nasaApiEnd,
        { timeStandard: "UTC" }
      );
      const p1 = searchPrimaryMarssoninaInfection(raw, win, false, "phase1");
      const p2 = searchPrimaryMarssoninaInfection(raw, win, false, "phase2");
      assert.equal(p1.primary?.infectionDate, "2026-05-21");
      assert.equal(p2.primary?.infectionDate, "2026-05-21");

      const gdd1 = await gddForPrimary(36.39, 139.06, p1.primary!.infectionDate);
      const gdd2 = await gddForPrimary(36.39, 139.06, p2.primary!.infectionDate);

      assert.equal(gdd1.estimatedOnsetDate, "2026-06-05");
      assert.equal(gdd2.estimatedOnsetDate, "2026-06-05");
    }
  );

  it("shows not reached only when threshold not reached", () => {
    const records: DailyWeatherRecord[] = [
      {
        date: "2026-05-01",
        temperature_avg: 10,
        humidity_avg: 50,
        temperature_max: 12,
        temperature_min: 8,
        precipitation_mm: 0,
      },
    ];
    const summary = buildMarssoninaGddReportSummary(
      "2026-05-01",
      records,
      [],
      "2026-05-01",
      "2026-05-02"
    );
    assert.equal(summary.thresholdReached, false);
    assert.equal(summary.estimatedOnsetDate, null);
    assert.match(summary.thresholdStatusLabel, /未到達/);
  });
});

async function gddForPrimary(lat: number, lon: number, primaryDate: string) {
  const daily = await fetchNasaPowerDaily(lat, lon, primaryDate, END);
  const summary = buildMarssoninaGddReportSummary(
    primaryDate,
    daily,
    [],
    END,
    TODAY
  );
  assert.equal(summary.missingBeforeOnsetDates.length, 0);
  return summary;
}

function assertGddFieldsFromCompute(primaryDate: string) {
  const est = computeMarssoninaGddEstimate(primaryDate, [], [], END, TODAY);
  assertGddEstimateApiShape(est);
  const loose = est as unknown as Record<string, unknown>;
  assert.equal(loose.status, undefined);
  assert.equal(loose.onsetDate, undefined);
}
