import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ascosporeMaturityPercentFromGdd,
  computeAppleScabAscosporeMaturity,
  resolveAppleScabBiofix,
  resolveAppleScabBiofixDate,
} from "./apple-scab-ascospore-gdd";

describe("apple-scab-ascospore-gdd", () => {
  it("resolves Gunma biofix from season window", () => {
    assert.equal(
      resolveAppleScabBiofixDate(36.39, 139.06, "2026-05-10T18:00:00+09:00"),
      "2026-04-01"
    );
  });

  it("prefers green tip over season proxy", () => {
    const b = resolveAppleScabBiofix(
      36.39,
      139.06,
      "2026-05-10T18:00:00+09:00",
      "2026-03-28"
    );
    assert.equal(b.date, "2026-03-28");
    assert.equal(b.source, "green_tip");
  });

  it("approximates logistic anchors", () => {
    assert.ok(ascosporeMaturityPercentFromGdd(130) < 10);
    assert.ok(Math.abs(ascosporeMaturityPercentFromGdd(280) - 50) < 3);
    assert.ok(ascosporeMaturityPercentFromGdd(600) > 97);
  });

  it("accumulates GDD through measured daily", () => {
    const daily = [
      { date: "2026-04-01", temperature_avg: 10 } as const,
      { date: "2026-04-02", temperature_avg: 12 } as const,
    ].map((r) => ({
      ...r,
      humidity_avg: null,
      temperature_max: null,
      temperature_min: null,
      precipitation_mm: null,
    }));
    const m = computeAppleScabAscosporeMaturity(
      "2026-04-01",
      "2026-04-02T18:00:00+09:00",
      daily,
      []
    );
    assert.equal(m.gddDayC, 22);
    assert.ok(m.maturityPercent > 0);
  });

  it("halts GDD accumulation after seven dry days", () => {
    const mk = (date: string, precip: number) => ({
      date,
      temperature_avg: 15,
      humidity_avg: null,
      temperature_max: null,
      temperature_min: null,
      precipitation_mm: precip,
    });
    const daily = [
      mk("2026-04-01", 2),
      mk("2026-04-02", 2),
      ...Array.from({ length: 8 }, (_, i) =>
        mk(`2026-04-${String(3 + i).padStart(2, "0")}`, 0)
      ),
    ];
    const m = computeAppleScabAscosporeMaturity(
      "2026-04-01",
      "2026-04-10T12:00:00+09:00",
      daily,
      []
    );
    assert.equal(m.gddDayC, 120);
    assert.equal(m.dryHaltApplied, true);
  });
});
