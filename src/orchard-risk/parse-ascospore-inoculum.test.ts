import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ascosporePoolSupplyFactor,
  parseScabInoculumLevel,
  scabInoculumInitialPoolPercent,
} from "./parse-ascospore-inoculum";

describe("parse-ascospore-inoculum", () => {
  it("parses low, normal, high", () => {
    assert.equal(parseScabInoculumLevel(null), "normal");
    assert.equal(parseScabInoculumLevel("high"), "high");
    assert.equal(parseScabInoculumLevel("LOW"), "low");
    assert.equal(parseScabInoculumLevel("bogus"), "normal");
  });

  it("maps to initial pool percent", () => {
    assert.equal(scabInoculumInitialPoolPercent("low"), 60);
    assert.equal(scabInoculumInitialPoolPercent("normal"), 100);
    assert.equal(scabInoculumInitialPoolPercent("high"), 130);
  });

  it("normalizes pool supply factor by initial cap", () => {
    assert.equal(ascosporePoolSupplyFactor(65, 130), 0.5);
    assert.equal(ascosporePoolSupplyFactor(60, 60), 1);
  });
});
