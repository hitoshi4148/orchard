import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSixDayWeather } from "./daily-aggregate";
import { windFromDegToCompass } from "./wind-utils";

describe("wind-utils", () => {
  it("maps degrees to compass labels", () => {
    assert.equal(windFromDegToCompass(0), "北");
    assert.equal(windFromDegToCompass(90), "東");
    assert.equal(windFromDegToCompass(225), "南西");
  });
});

describe("daily-aggregate wind", () => {
  it("aggregates max wind per JST day", () => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
    }).format(new Date());
    const hourly = [
      {
        datetime: `${today}T10:00:00+09:00`,
        temperature: 20,
        humidity: 80,
        precipitation_mm: 0,
        wind_speed_ms: 3,
        wind_from_deg: 180,
      },
      {
        datetime: `${today}T14:00:00+09:00`,
        temperature: 22,
        humidity: 75,
        precipitation_mm: 0,
        wind_speed_ms: 7.2,
        wind_from_deg: 270,
      },
    ];
    const days = buildSixDayWeather(hourly);
    assert.equal(days[0].maxWindMs, 7.2);
    assert.equal(days[0].maxWindCompass, "西");
  });
});
