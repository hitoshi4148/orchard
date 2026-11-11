import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcGrapeBlackRot } from "./grape-black-rot";

const heavyRain = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-06-20T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: 24,
  humidity: 92,
  precipitation_mm: h >= 11 && h <= 14 ? 1.2 : 0,
}));

describe("grape black rot rain burst", () => {
  it("boosts youngfruit stage with heavy rain", () => {
    const input = {
      hourly: heavyRain,
      daily: [],
      targetDateTime: "2026-06-20T18:00:00+09:00",
    };
    const young = calcGrapeBlackRot(input, { growthStageId: "youngfruit" });
    const mature = calcGrapeBlackRot(input, { growthStageId: "maturity" });
    assert.ok((young.percent ?? 0) > (mature.percent ?? 0));
    assert.match(young.rationale, /強雨適温/);
  });
});
