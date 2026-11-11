import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCropDiseaseOnsetFromWeather } from "./crop-latency-onset";
import { OrchardDailyWeather } from "./types";

function day(
  date: string,
  offset: number,
  avgTemp: number
): OrchardDailyWeather {
  return {
    dayOffset: offset,
    label: offset === 0 ? "本日" : `${offset}日先`,
    date,
    avgTemp,
    maxTemp: avgTemp + 2,
    minTemp: avgTemp - 2,
    precipMm: 0,
    humidityPct: 80,
    leafWetHours: 4,
    leafWetIsEstimated: true,
  };
}

describe("crop latency onset", () => {
  it("computes latency window from infection peak date", () => {
    const weather5d = [
      day("2026-06-01", 0, 18),
      day("2026-06-02", 1, 22),
      day("2026-06-03", 2, 24),
      day("2026-06-04", 3, 23),
      day("2026-06-05", 4, 21),
      day("2026-06-06", 5, 20),
    ];
    const row = buildCropDiseaseOnsetFromWeather(
      "grape:black_rot",
      "黒とう病",
      ["low", "high", "caution", "low", "low", "low"],
      weather5d
    );
    assert.equal(row.estimatedInfectionDate, "2026-06-02");
    assert.match(row.predictedOnsetWindow, /2026-06-12/);
    assert.match(row.predictedOnsetWindow, /2026-06-16/);
    assert.equal(row.isDemo, false);
    assert.equal(row.modelStatus, "seasonal");
  });

  it("reaches GDD threshold within forecast for downy mildew", () => {
    const weather5d = [
      day("2026-07-01", 0, 20),
      day("2026-07-02", 1, 24),
      day("2026-07-03", 2, 26),
      day("2026-07-04", 3, 25),
      day("2026-07-05", 4, 22),
      day("2026-07-06", 5, 21),
    ];
    const row = buildCropDiseaseOnsetFromWeather(
      "grape:downy_mildew",
      "べと病",
      ["low", "high", "high", "caution", "low", "low"],
      weather5d
    );
    assert.equal(row.modelStatus, "gdd");
    assert.match(row.predictedOnsetWindow, /2026-07-0/);
    assert.ok(
      row.gddSinceInfectionDayC != null && row.gddSinceInfectionDayC >= 60
    );
  });

  it("uses extended latency for late rot", () => {
    const weather5d = [
      day("2026-08-10", 0, 26),
      day("2026-08-11", 1, 27),
      day("2026-08-12", 2, 28),
      day("2026-08-13", 3, 27),
      day("2026-08-14", 4, 26),
      day("2026-08-15", 5, 25),
    ];
    const row = buildCropDiseaseOnsetFromWeather(
      "grape:late_rot",
      "晩腐病",
      ["caution", "high", "low", "low", "low", "low"],
      weather5d
    );
    assert.match(row.predictedOnsetWindow, /2026-08-2[45]/);
    assert.match(row.note, /タイムラグ/);
  });
});
