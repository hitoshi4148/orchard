import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcGrapeDisease } from "./grape-models";

describe("grape disease models", () => {
  it("raises downy mildew risk in peak summer month", () => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      dateTime: `2026-06-15T${String(h).padStart(2, "0")}:00:00+09:00`,
      temperature: 22,
      humidity: 95,
      precipitation: h >= 10 && h <= 16 ? 0.4 : 0,
    }));
    const june = calcGrapeDisease("grape:downy_mildew", {
      hourly: hours,
      daily: [],
      targetDateTime: "2026-06-15T18:00:00+09:00",
    });
    const winter = calcGrapeDisease("grape:downy_mildew", {
      hourly: hours,
      daily: [],
      targetDateTime: "2026-01-15T18:00:00+09:00",
    });
    assert.ok((june.percent ?? 0) > (winter.percent ?? 0));
    assert.match(june.rationale, /ぶどうべと病/);
    assert.match(june.rationale, /設計: docs/);
  });
});
