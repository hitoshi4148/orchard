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

  it("scores high when 6+ precip-wet hours at qualifying temp", () => {
    const hours = [];
    for (let h = 0; h < 8; h += 1) {
      hours.push(
        baseHour(
          `2026-05-25T${String(10 + h).padStart(2, "0")}:00:00+09:00`,
          18,
          0.6
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
});
