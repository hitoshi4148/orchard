import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPeachScab } from "./peach-scab";
import { calcPeachSeasonalHeuristic } from "./peach-season";

const springWet = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-05-05T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: 20,
  humidity: 93,
  precipitation_mm: h >= 6 && h <= 18 ? 0.2 : 0,
}));

describe("peach scab dedicated model", () => {
  it("uses streak and stage for leaf period", () => {
    const input = {
      hourly: springWet,
      daily: [],
      targetDateTime: "2026-05-05T18:00:00+09:00",
    };
    const leaf = calcPeachScab(input, { growthStageId: "leaf" });
    const harvest = calcPeachScab(input, { growthStageId: "postharvest" });
    assert.ok((leaf.percent ?? 0) > (harvest.percent ?? 0));
    assert.match(leaf.rationale, /連続/);
  });

  it("beats generic heuristic on wet spring fixture", () => {
    const input = {
      hourly: springWet,
      daily: [],
      targetDateTime: "2026-05-05T18:00:00+09:00",
    };
    const specialized = calcPeachScab(input, { growthStageId: "leaf" });
    const generic = calcPeachSeasonalHeuristic("peach:scab", input);
    assert.ok((specialized.percent ?? 0) >= (generic.percent ?? 0));
  });
});
