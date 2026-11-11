import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcPeachBacterialShotHole } from "./peach-bacterial-shot-hole";

const stormy = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-05-15T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: 20,
  humidity: 90,
  precipitation_mm: h === 12 ? 2.5 : h >= 10 && h <= 14 ? 0.4 : 0,
}));

describe("peach bacterial shot hole splash proxy", () => {
  it("scores higher with heavy rain hours", () => {
    const spring = calcPeachBacterialShotHole(
      {
        hourly: stormy,
        daily: [],
        targetDateTime: "2026-05-15T18:00:00+09:00",
      },
      { growthStageId: "leaf" }
    );
    const dry = calcPeachBacterialShotHole(
      {
        hourly: stormy.map((h) => ({ ...h, precipitation_mm: 0 })),
        daily: [],
        targetDateTime: "2026-05-15T18:00:00+09:00",
      },
      { growthStageId: "leaf" }
    );
    assert.ok((spring.percent ?? 0) > (dry.percent ?? 0));
    assert.match(spring.rationale, /飛沫代理/);
    assert.match(spring.rationale, /風未モデル化/);
  });

  it("adds windy splash when wind speed is available", () => {
    const windy = stormy.map((h) => ({
      ...h,
      wind_speed_ms: h.precipitation_mm >= 0.3 ? 6 : 2,
    }));
    const result = calcPeachBacterialShotHole(
      {
        hourly: windy,
        daily: [],
        targetDateTime: "2026-05-15T18:00:00+09:00",
      },
      { growthStageId: "leaf" }
    );
    assert.match(result.rationale, /風速4m\/s以上×降水/);
  });
});
