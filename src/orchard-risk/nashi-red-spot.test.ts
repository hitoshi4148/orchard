import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcNashiRedSpot } from "./infection-calculators";
import type { DiseaseWeatherInput } from "../disease/types";

describe("nashi red spot", () => {
  it("returns low risk in winter", () => {
    const input: DiseaseWeatherInput = {
      targetDateTime: "2026-11-11T18:00:00+09:00",
      hourly: Array.from({ length: 48 }, (_, i) => ({
        datetime: `2026-11-11T${String(i % 24).padStart(2, "0")}:00:00+09:00`,
        temperature: 15,
        humidity: 95,
        precipitation_mm: 0.5,
      })),
    };
    const r = calcNashiRedSpot(input);
    assert.ok(r.percent != null && r.percent <= 15);
    assert.match(r.rationale, /ビャクシン/);
  });
});
