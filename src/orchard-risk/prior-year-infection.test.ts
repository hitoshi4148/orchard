import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustLevelForPriorYear,
  priorYearSummaryLabel,
} from "./prior-year-infection";

describe("prior-year-infection", () => {
  it("bumps gray_spot and scab for severe", () => {
    assert.equal(
      adjustLevelForPriorYear("low", "severe", "peach:gray_spot"),
      "caution"
    );
    assert.equal(
      adjustLevelForPriorYear("caution", "severe", "peach:scab"),
      "high"
    );
    assert.equal(
      adjustLevelForPriorYear("high", "severe", "peach:scab"),
      "high"
    );
  });

  it("ignores unrelated diseases", () => {
    assert.equal(
      adjustLevelForPriorYear("low", "severe", "peach:leaf_curl"),
      "low"
    );
  });

  it("moderate only lifts low to caution", () => {
    assert.equal(
      adjustLevelForPriorYear("low", "moderate", "peach:gray_spot"),
      "caution"
    );
    assert.equal(
      adjustLevelForPriorYear("caution", "moderate", "peach:gray_spot"),
      "caution"
    );
  });

  it("summary label for UI", () => {
    assert.equal(priorYearSummaryLabel("severe"), "昨年重いため灰星・黒星の係数↑");
    assert.equal(priorYearSummaryLabel(null), null);
  });
});
