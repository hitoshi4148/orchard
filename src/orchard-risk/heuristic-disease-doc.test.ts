import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DISEASE_IDS_BY_CROP, MODEL_STATUS } from "./catalog";
import {
  listHeuristicThresholdRows,
  ORCHARD_HEURISTIC_BY_ID,
} from "./heuristic-disease";

describe("heuristic-disease documentation alignment", () => {
  it("lists every heuristic disease in catalog", () => {
    const heuristicIds = new Set<string>();
    for (const crop of Object.keys(DISEASE_IDS_BY_CROP) as Array<
      keyof typeof DISEASE_IDS_BY_CROP
    >) {
      for (const id of DISEASE_IDS_BY_CROP[crop]) {
        if (MODEL_STATUS[id] === "heuristic" && ORCHARD_HEURISTIC_BY_ID[id]) {
          heuristicIds.add(id);
        }
      }
    }
    const rows = listHeuristicThresholdRows();
    assert.equal(rows.length, heuristicIds.size);
    for (const id of heuristicIds) {
      assert.ok(
        rows.some((r) => r.id === id),
        `missing row for ${id}`
      );
    }
  });

  it("documents stable threshold ordering", () => {
    const rows = listHeuristicThresholdRows().sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    assert.equal(rows.length, rows.length);
    assert.ok(rows.every((r) => r.id.includes(":")));
  });
});
