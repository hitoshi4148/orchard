import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
});
