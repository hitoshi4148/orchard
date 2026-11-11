import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASCOSPORE_RELEASE_PRECIP_MM_MID,
  ascosporeReleasePrecipFactor,
} from "./apple-scab-ascospore-season-pool";

describe("ascosporeReleasePrecipFactor", () => {
  it("is near 1.0 at reference precip", () => {
    const f = ascosporeReleasePrecipFactor(ASCOSPORE_RELEASE_PRECIP_MM_MID);
    assert.ok(f >= 0.95 && f <= 1.05);
  });

  it("increases with heavier rain", () => {
    const light = ascosporeReleasePrecipFactor(0.5);
    const heavy = ascosporeReleasePrecipFactor(8);
    assert.ok(heavy > light);
  });
});
