import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcGrapeDownyMildew } from "./grape-downy-mildew";
import { calcGrapeSeasonalHeuristic } from "./grape-season";

const rainy22c = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-06-15T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: 22,
  humidity: 95,
  precipitation_mm: h >= 10 && h <= 16 ? 0.5 : 0,
}));

describe("grape downy mildew P2", () => {
  it("scores higher in summer rainy weather than winter", () => {
    const june = calcGrapeDownyMildew({
      hourly: rainy22c,
      daily: [],
      targetDateTime: "2026-06-15T18:00:00+09:00",
    });
    const winter = calcGrapeDownyMildew({
      hourly: rainy22c,
      daily: [],
      targetDateTime: "2026-01-15T18:00:00+09:00",
    });
    assert.ok((june.percent ?? 0) > (winter.percent ?? 0));
    assert.match(june.rationale, /適温濡れ/);
  });

  it("rewards precip on top of seasonal heuristic baseline", () => {
    const input = {
      hourly: rainy22c,
      daily: [],
      targetDateTime: "2026-06-15T18:00:00+09:00",
    };
    const specialized = calcGrapeDownyMildew(input);
    const generic = calcGrapeSeasonalHeuristic("grape:downy_mildew", input);
    assert.ok((specialized.percent ?? 0) >= (generic.percent ?? 0));
  });
});
