import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcGrapeGrayMold } from "./grape-gray-mold";

const coolWet = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-05-10T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: 18,
  humidity: 94,
  precipitation_mm: h >= 4 && h <= 14 ? 0.15 : 0,
}));

describe("grape gray mold stage weighting", () => {
  it("scores higher during bloom than postharvest", () => {
    const input = {
      hourly: coolWet,
      daily: [],
      targetDateTime: "2026-05-10T18:00:00+09:00",
    };
    const bloom = calcGrapeGrayMold(input, { growthStageId: "bloom" });
    const post = calcGrapeGrayMold(input, { growthStageId: "postharvest" });
    assert.ok((bloom.percent ?? 0) > (post.percent ?? 0));
    assert.match(bloom.rationale, /生育 bloom/);
  });
});
