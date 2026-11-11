import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ascosporeReleaseFactorAfterDepletion,
  computeAppleScabConidialRisk,
  conidialSupplyPercentForStage,
} from "./apple-scab-conidia";

describe("apple-scab-conidia", () => {
  it("supplies conidia from petal fall onward", () => {
    assert.equal(conidialSupplyPercentForStage("bloom"), 0);
    assert.ok(conidialSupplyPercentForStage("youngfruit") > 40);
  });

  it("scales mills by supply", () => {
    const r = computeAppleScabConidialRisk(80, "youngfruit");
    assert.equal(r.percent, 44);
    assert.match(r.summary, /分生胞子/);
  });

  it("decays ascospore factor after depletion GDD", () => {
    assert.equal(ascosporeReleaseFactorAfterDepletion(400), 1);
    assert.ok(ascosporeReleaseFactorAfterDepletion(620) < 0.2);
  });
});
