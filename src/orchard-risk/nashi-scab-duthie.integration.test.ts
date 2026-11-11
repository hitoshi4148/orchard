import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../disease/nasa-power";
import { calculateNashiScabDuthieRisk } from "./nashi-scab-duthie";
import { GUNMA_VALIDATION_SITES } from "./gunma-reference";
import { NASHI_SCAB_DUTHIE_GOLDEN } from "./validation-golden";

describe("nashi-scab-duthie golden (Gunma spring)", () => {
  const site = GUNMA_VALIDATION_SITES.find(
    (s) => s.id === NASHI_SCAB_DUTHIE_GOLDEN.siteId
  );
  assert.ok(site);

  it(
    `${site!.label} — Duthie risk matches spring golden`,
    { timeout: 180_000 },
    async () => {
      const { hourlyStart, hourlyEnd, targetDateTime } =
        NASHI_SCAB_DUTHIE_GOLDEN;
      const [daily, hourly] = await Promise.all([
        fetchNasaPowerDaily(site!.lat, site!.lon, hourlyStart, hourlyEnd),
        fetchNasaPowerHourly(site!.lat, site!.lon, hourlyStart, hourlyEnd, {
          timeStandard: "LST",
        }),
      ]);
      const risk = calculateNashiScabDuthieRisk({
        hourly,
        daily,
        targetDateTime,
      });
      assert.ok(risk != null, "risk should not be null");
      const diff = Math.abs(
        risk - NASHI_SCAB_DUTHIE_GOLDEN.expectedRiskPercent
      );
      assert.ok(
        diff <= NASHI_SCAB_DUTHIE_GOLDEN.tolerance,
        `expected ${NASHI_SCAB_DUTHIE_GOLDEN.expectedRiskPercent} ±${NASHI_SCAB_DUTHIE_GOLDEN.tolerance}, got ${risk}`
      );
    }
  );
});
