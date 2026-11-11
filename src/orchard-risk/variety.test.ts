import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCropVarietyFactor, getDiseaseVarietyFactor } from "./variety";

describe("orchard variety factors", () => {
  it("uses disease-specific override when set", () => {
    assert.equal(getDiseaseVarietyFactor("apple", "つがる", "apple:scab"), 0.88);
    assert.equal(getCropVarietyFactor("apple", "つがる"), 0.9);
  });

  it("falls back to crop baseline", () => {
    assert.equal(getDiseaseVarietyFactor("grape", "甲州", "grape:downy_mildew"), 0.85);
    assert.equal(getDiseaseVarietyFactor("grape", "甲州", "grape:late_rot"), 0.9);
  });

  it("returns 1.0 for unknown variety", () => {
    assert.equal(getDiseaseVarietyFactor("peach", "未登録品種", "peach:scab"), 1.0);
  });
});
