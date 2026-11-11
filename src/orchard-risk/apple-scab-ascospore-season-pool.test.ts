import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ascosporePoolAtDate,
  buildAscosporePoolSnapshots,
  ASCOSPORE_SEASON_INITIAL_POOL,
} from "./apple-scab-ascospore-season-pool";

describe("apple-scab-ascospore-season-pool", () => {
  it("depletes pool over repeated rain events", () => {
    const daily = Array.from({ length: 35 }, (_, i) => {
      const day = i + 1;
      const date =
        day <= 30
          ? `2026-04-${String(day).padStart(2, "0")}`
          : `2026-05-${String(day - 30).padStart(2, "0")}`;
      return {
        date,
        temperature_avg: 18,
      humidity_avg: null,
      temperature_max: null,
      temperature_min: null,
        precipitation_mm: i % 5 === 0 ? 1.5 : 0.05,
      };
    });
    const hourly = [];
    for (let h = 10; h < 16; h += 1) {
      hourly.push({
        datetime: `2026-05-05T${String(h).padStart(2, "0")}:00:00+09:00`,
        temperature: 18,
        humidity: 98,
        precipitation_mm: 0.6,
      });
    }
    const snaps = buildAscosporePoolSnapshots(
      "2026-04-01",
      "green_tip",
      daily,
      hourly
    );
    const last = ascosporePoolAtDate(
      snaps,
      "2026-05-05T18:00:00+09:00"
    );
    assert.ok(last);
    assert.ok(last.remainingPercent < ASCOSPORE_SEASON_INITIAL_POOL);
    assert.ok(last.cumulativeReleasedPercent > 5);
  });

  it("scales depletion with initial inoculum pool", () => {
    const daily = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-04-${String(i + 1).padStart(2, "0")}`,
      temperature_avg: 18,
      humidity_avg: null,
      temperature_max: null,
      temperature_min: null,
      precipitation_mm: i % 4 === 0 ? 2 : 0,
    }));
    const hourly = [
      {
        datetime: "2026-04-10T11:00:00+09:00",
        temperature: 18,
        humidity: 99,
        precipitation_mm: 1.2,
      },
      {
        datetime: "2026-04-10T12:00:00+09:00",
        temperature: 18,
        humidity: 98,
        precipitation_mm: 0.8,
      },
    ];
    const normal = buildAscosporePoolSnapshots(
      "2026-04-01",
      "green_tip",
      daily,
      hourly,
      100
    );
    const low = buildAscosporePoolSnapshots(
      "2026-04-01",
      "green_tip",
      daily,
      hourly,
      60
    );
    const a = ascosporePoolAtDate(normal, "2026-04-10T18:00:00+09:00");
    const b = ascosporePoolAtDate(low, "2026-04-10T18:00:00+09:00");
    assert.ok(a && b);
    assert.ok(b.remainingPercent < a.remainingPercent);
    assert.equal(b.rainEventsProcessed, a.rainEventsProcessed);
  });
});
