import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcMarssoninaForecastInfection } from "./marssonina-forecast-risk";

const baseHour = (
  iso: string,
  temp: number,
  precip: number
): { datetime: string; temperature: number; humidity: number; precipitation_mm: number } => ({
  datetime: iso,
  temperature: temp,
  humidity: 80,
  precipitation_mm: precip,
});

describe("marssonina-forecast-risk", () => {
  it("returns low before primary infection date", () => {
    const res = calcMarssoninaForecastInfection(
      {
        daily: [],
        hourly: [],
        targetDateTime: "2026-05-20T18:00:00+09:00",
      },
      { primaryInfectionDate: "2026-05-24", totalGddDayC: null }
    );
    assert.equal(res.percent, 6);
  });

  it("scores high when P2 precip day qualifies", () => {
    const hours = [];
    for (let h = 0; h < 24; h += 1) {
      const precip = h >= 9 && h <= 16 ? 0.6 : 0;
      hours.push(
        baseHour(
          `2026-05-25T${String(h).padStart(2, "0")}:00:00+09:00`,
          18,
          precip
        )
      );
    }
    const res = calcMarssoninaForecastInfection(
      {
        daily: [],
        hourly: hours,
        targetDateTime: "2026-05-25T18:00:00+09:00",
      },
      { primaryInfectionDate: "2026-05-24", totalGddDayC: 120 }
    );
    assert.ok((res.percent ?? 0) >= 75);
  });

  it("uses per-day GDD when gddThroughTargetYmd is set", () => {
    const hours = [];
    for (let h = 0; h < 8; h += 1) {
      hours.push(
        baseHour(
          `2026-05-25T${String(10 + h).padStart(2, "0")}:00:00+09:00`,
          17,
          0.6
        )
      );
    }
    const lowGdd = calcMarssoninaForecastInfection(
      {
        daily: [],
        hourly: hours,
        targetDateTime: "2026-05-25T18:00:00+09:00",
      },
      {
        primaryInfectionDate: "2026-05-24",
        totalGddDayC: 180,
        gddThroughTargetYmd: () => 100,
      }
    );
    const highGdd = calcMarssoninaForecastInfection(
      {
        daily: [],
        hourly: hours,
        targetDateTime: "2026-05-25T18:00:00+09:00",
      },
      {
        primaryInfectionDate: "2026-05-24",
        totalGddDayC: 100,
        gddThroughTargetYmd: () => 170,
      }
    );
    assert.ok((highGdd.percent ?? 0) > (lowGdd.percent ?? 0));
  });
});
