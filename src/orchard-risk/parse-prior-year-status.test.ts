import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePriorYearStatus } from "./parse-prior-year-status";

describe("parse-prior-year-status", () => {
  it("parses light/moderate/severe", () => {
    assert.equal(parsePriorYearStatus("light"), "light");
    assert.equal(parsePriorYearStatus("moderate"), "moderate");
    assert.equal(parsePriorYearStatus("severe"), "severe");
    assert.equal(parsePriorYearStatus("S"), "severe");
  });

  it("returns null for empty or unknown", () => {
    assert.equal(parsePriorYearStatus(""), null);
    assert.equal(parsePriorYearStatus(null), null);
    assert.equal(parsePriorYearStatus("heavy"), null);
  });
});
