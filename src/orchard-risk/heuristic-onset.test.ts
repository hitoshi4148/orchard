import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildHeuristicOnsetFromInfection } from "./onset";

describe("heuristic onset from infection levels", () => {
  it("detects peak caution day", () => {
    const row = buildHeuristicOnsetFromInfection(
      "apple:alternaria",
      "斑点落葉病",
      ["low", "low", "caution", "high", "caution", "low"]
    );
    assert.match(row.predictedOnsetWindow, /3日先/);
    assert.equal(row.confidence, "中");
  });

  it("marks live seasonal onset as non-demo", () => {
    const row = buildHeuristicOnsetFromInfection(
      "apple:blotch",
      "輪紋病",
      ["low", "caution", "high", "low", "low", "low"],
      { modelStatus: "seasonal", connected: true }
    );
    assert.equal(row.isDemo, false);
    assert.equal(row.modelStatus, "seasonal");
  });

  it("reports no peak when all low", () => {
    const row = buildHeuristicOnsetFromInfection(
      "nashi:red_spot",
      "赤星病",
      ["low", "low", "low", "low", "low", "low"]
    );
    assert.equal(row.estimatedInfectionDate, "—");
    assert.match(row.predictedOnsetWindow, /感染危険なし/);
  });
});
