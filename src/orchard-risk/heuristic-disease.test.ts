import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ORCHARD_HEURISTIC_BY_ID } from "./heuristic-disease";

describe("heuristic-disease catalog", () => {
  it("covers all heuristic disease ids in catalog", () => {
    const expected = [
      "apple:alternaria",
      "apple:anthracnose",
      "apple:blotch",
      "nashi:blotch",
      "nashi:black_spot",
      "nashi:anthracnose",
    ];
    for (const id of expected) {
      assert.ok(ORCHARD_HEURISTIC_BY_ID[id]?.reference);
    }
  });
});
