import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchNasaPowerHourly } from "../disease/nasa-power";
import {
  assessExplorationHourlyCompleteness,
  filterHourlyForExploration,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "./marssonina-infection";

describe("marssonina-infection integration", () => {
  const bloom = "2026-04-25";
  const end = "2026-11-08";

  it(
    "Hirosaki 40.82/140.74 — full coverage and Phase2 primary",
    { timeout: 120_000 },
    async () => {
      const win = resolveMarssoninaNasaWindow(bloom, end);
      const raw = await fetchNasaPowerHourly(
        40.82,
        140.74,
        win.nasaApiStart,
        win.nasaApiEnd,
        { timeStandard: "UTC" }
      );
      const filtered = filterHourlyForExploration(raw, bloom, end);
      const completeness = assessExplorationHourlyCompleteness(
        filtered,
        bloom,
        end
      );
      assert.equal(completeness.coverage, "full");
      assert.equal(completeness.expectedHours, 198 * 24);
      assert.equal(
        completeness.missingHourKeys.filter((k) => k.startsWith(`${bloom}T0`))
          .length,
        0,
        "bloom day 00-08 JST should be present after UTC+buffer fetch"
      );

      const res = searchPrimaryMarssoninaInfection(raw, win, false);
      assert.equal(res.coverage, "full");
      assert.equal(res.marssoninaStatus, "primary_infection_estimated");
      assert.equal(res.primary?.infectionDate, "2026-05-24");
      assert.equal(res.primary?.wetDurationHours, 7);
      assert.equal(res.primary?.wetAvgTempC, 16.5);
      assert.equal(res.primary?.precipWetHourCount, 5);
      assert.equal(res.primary?.wetnessRule, "precip_0.5mm_suzuki_phase2");
      assert.ok(res.primary?.periodStart);
      assert.ok(res.primary?.periodEnd);
    }
  );

  it(
    "default UI 36.39/139.06 — reproducible full search",
    { timeout: 120_000 },
    async () => {
      const win = resolveMarssoninaNasaWindow(bloom, end);
      const raw = await fetchNasaPowerHourly(
        36.39,
        139.06,
        win.nasaApiStart,
        win.nasaApiEnd,
        { timeStandard: "UTC" }
      );
      const res = searchPrimaryMarssoninaInfection(raw, win, false);
      assert.equal(res.coverage, "full");
      assert.equal(res.marssoninaStatus, "primary_infection_estimated");
      assert.equal(res.primary?.infectionDate, "2026-05-21");
      assert.equal(res.primary?.wetDurationHours, 18);
      assert.equal(res.primary?.wetAvgTempC, 16.5);
      assert.equal(res.primary?.precipWetHourCount, 15);
      assert.equal(res.primary?.wetnessRule, "precip_0.5mm_suzuki_phase2");
    }
  );
});
