import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { DISEASE_IDS_BY_CROP } from "./catalog";
import { orchardDiseaseModelDocPath } from "./diseases/crop-model-doc";
import {
  calcGrapeDisease,
  listGrapeDiseaseModelIds,
} from "./diseases/grape-models";
import {
  calcPeachDisease,
  listPeachDiseaseModelIds,
} from "./diseases/peach-models";

function wetHourlyFixture(date: string, temp: number, precip = 0.4) {
  return Array.from({ length: 24 }, (_, h) => ({
    datetime: `${date}T${String(h).padStart(2, "0")}:00:00+09:00`,
    temperature: temp,
    humidity: 95,
    precipitation_mm: h >= 8 && h <= 20 ? precip : 0,
  }));
}

describe("crop disease docs and modules", () => {
  it("has a design memo for every grape and peach disease", () => {
    const ids = [
      ...DISEASE_IDS_BY_CROP.grape,
      ...DISEASE_IDS_BY_CROP.peach,
    ];
    for (const id of ids) {
      const path = orchardDiseaseModelDocPath(id);
      assert.ok(fs.existsSync(path), `missing ${path}`);
    }
    assert.deepEqual(listGrapeDiseaseModelIds(), [
      ...DISEASE_IDS_BY_CROP.grape,
    ].sort());
    assert.deepEqual(listPeachDiseaseModelIds(), [
      ...DISEASE_IDS_BY_CROP.peach,
    ].sort());
  });

  it("rationales cite the design memo path", () => {
    const hours = wetHourlyFixture("2026-06-15", 22);
    const grape = calcGrapeDisease("grape:black_rot", {
      hourly: hours,
      daily: [],
      targetDateTime: "2026-06-15T18:00:00+09:00",
    });
    assert.match(grape.rationale, /設計: docs\/orchard-disease-models\//);
    const peach = calcPeachDisease("peach:scab", {
      hourly: hours,
      daily: [],
      targetDateTime: "2026-05-10T18:00:00+09:00",
    });
    assert.match(peach.rationale, /設計: docs\/orchard-disease-models\//);
  });
});
