import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateNashiScabIshiiRisk,
  detectNashiScabInfectionEvents,
  nashiScabMinWetnessHours,
} from "./nashi-scab-ishii";

describe("nashi-scab-ishii", () => {
  it("interpolates Table 3 min wetness", () => {
    assert.equal(nashiScabMinWetnessHours(22), 7);
    assert.equal(nashiScabMinWetnessHours(10), 16);
    const at18 = nashiScabMinWetnessHours(18);
    assert.ok(at18 != null && Math.abs(at18 - 8) < 0.01);
    assert.equal(nashiScabMinWetnessHours(9), null);
  });

  it("detects infection when wet period exceeds L(T)", () => {
    const hours = [];
    for (let h = 0; h < 8; h += 1) {
      hours.push({
        datetime: `2026-06-01T${String(10 + h).padStart(2, "0")}:00:00+09:00`,
        temperature: 20,
        humidity: 98,
        precipitation_mm: 0.2,
      });
    }
    const target = "2026-06-01T20:00:00+09:00";
    const events = detectNashiScabInfectionEvents(
      hours,
      new Date(target).getTime()
    );
    assert.equal(events.length, 1);
    assert.ok(events[0].durationHours >= events[0].requiredWetnessHours);
  });

  it("returns elevated risk after qualifying wet period", () => {
    const hours = [];
    for (let h = 0; h < 9; h += 1) {
      hours.push({
        datetime: `2026-06-02T${String(8 + h).padStart(2, "0")}:00:00+09:00`,
        temperature: 21,
        humidity: 99,
        precipitation_mm: 0.15,
      });
    }
    const risk = calculateNashiScabIshiiRisk({
      daily: [],
      hourly: hours,
      targetDateTime: "2026-06-02T18:00:00+09:00",
    });
    assert.ok(risk != null && risk >= 40);
  });
});
