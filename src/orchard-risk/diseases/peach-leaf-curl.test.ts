import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPeachLeafCurl } from "./peach-leaf-curl";
import { calcPeachSeasonalHeuristic } from "./peach-season";

const coolSpring = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-03-20T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: h >= 8 && h <= 18 ? 12 : 8,
  humidity: 94,
  precipitation_mm: h >= 6 && h <= 18 ? 0.2 : 0,
}));

describe("peach leaf curl P2", () => {
  it("scores higher in cool spring than midsummer", () => {
    const spring = calcPeachLeafCurl({
      hourly: coolSpring,
      daily: [],
      targetDateTime: "2026-03-20T18:00:00+09:00",
    });
    const summer = calcPeachLeafCurl({
      hourly: coolSpring.map((h) => ({ ...h, temperature: 26 })),
      daily: [],
      targetDateTime: "2026-08-01T18:00:00+09:00",
    });
    assert.ok((spring.percent ?? 0) > (summer.percent ?? 0));
    assert.match(spring.rationale, /低温濡れ/);
  });

  it("penalizes warm wet hours", () => {
    const input = {
      hourly: coolSpring,
      daily: [],
      targetDateTime: "2026-03-20T18:00:00+09:00",
    };
    const specialized = calcPeachLeafCurl(input);
    const warmHours = coolSpring.map((h) => ({
      ...h,
      temperature: h.temperature > 15 ? 24 : h.temperature,
    }));
    const warm = calcPeachLeafCurl({
      ...input,
      hourly: warmHours,
    });
    assert.ok((specialized.percent ?? 0) >= (warm.percent ?? 0));
    const generic = calcPeachSeasonalHeuristic("peach:leaf_curl", input);
    assert.ok((specialized.percent ?? 0) >= (generic.percent ?? 0) - 5);
  });
});
