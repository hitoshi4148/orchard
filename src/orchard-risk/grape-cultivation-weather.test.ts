import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcGrapeDisease } from "./diseases/grape-models";
import { adjustWeatherForGrapeCultivation } from "./grape-cultivation-weather";
import { parseGrapeCultivationId } from "./parse-grape-cultivation";

const rainyHourly = Array.from({ length: 24 }, (_, h) => ({
  datetime: `2026-07-15T${String(h).padStart(2, "0")}:00:00+09:00`,
  temperature: 22,
  humidity: 90,
  precipitation_mm: h >= 10 && h <= 14 ? 0.5 : 0,
}));

describe("parse-grape-cultivation", () => {
  it("parses rain_shelter aliases", () => {
    assert.equal(parseGrapeCultivationId("rain_shelter"), "rain_shelter");
    assert.equal(parseGrapeCultivationId("shelter"), "rain_shelter");
    assert.equal(parseGrapeCultivationId(null), "open");
  });
});

describe("grape cultivation weather", () => {
  it("lowers downy risk under rain shelter vs open", () => {
    const input = {
      hourly: rainyHourly,
      daily: [],
      targetDateTime: "2026-07-15T14:00:00+09:00",
    };
    const open = calcGrapeDisease("grape:downy_mildew", input, {
      growthStageId: "youngfruit",
      cultivationId: "open",
    });
    const sheltered = calcGrapeDisease("grape:downy_mildew", input, {
      growthStageId: "youngfruit",
      cultivationId: "rain_shelter",
    });
    assert.ok((open.percent ?? 0) > (sheltered.percent ?? 0));
    assert.match(sheltered.rationale, /雨よけ/);
    assert.ok(
      adjustWeatherForGrapeCultivation(input, "rain_shelter").hourly[12]
        .precipitation_mm <
        input.hourly[12].precipitation_mm
    );
  });
});
