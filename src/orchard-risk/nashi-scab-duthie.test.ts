import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateNashiScabDuthieRisk,
  detectNashiScabDuthieEvents,
  nashiScabGerminationPercentAt,
} from "./nashi-scab-duthie";

describe("nashi-scab-duthie", () => {
  it("germination rises with wet duration at 22C", () => {
    const g4 = nashiScabGerminationPercentAt(4, 22);
    const g10 = nashiScabGerminationPercentAt(10, 22);
    assert.ok(g10 > g4);
    assert.ok(g10 > 30);
  });

  it("detects full infection when wetness and germination align", () => {
    const hours = [];
    for (let h = 0; h < 9; h += 1) {
      hours.push({
        datetime: `2026-06-01T${String(10 + h).padStart(2, "0")}:00:00+09:00`,
        temperature: 22,
        humidity: 99,
        precipitation_mm: 0.3,
      });
    }
    const events = detectNashiScabDuthieEvents(
      hours,
      new Date("2026-06-01T20:00:00+09:00").getTime()
    );
    assert.ok(events.some((e) => e.infectionCriteriaMet));
  });

  it("scores higher than idle weather", () => {
    const hours = [];
    for (let h = 0; h < 10; h += 1) {
      hours.push({
        datetime: `2026-06-02T${String(8 + h).padStart(2, "0")}:00:00+09:00`,
        temperature: 21,
        humidity: 99,
        precipitation_mm: 0.2,
      });
    }
    const risk = calculateNashiScabDuthieRisk({
      hourly: hours,
      daily: [],
      targetDateTime: "2026-06-02T18:00:00+09:00",
    });
    assert.ok(risk != null && risk >= 35);
  });
});
