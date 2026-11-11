import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DISEASE_IDS_BY_CROP } from "./catalog";
import {
  CROP_ONSET_CATALOG,
  listCropOnsetCatalogIds,
} from "./onset-catalog";

describe("onset catalog phase 3", () => {
  it("covers all grape and peach diseases", () => {
    const ids = [
      ...DISEASE_IDS_BY_CROP.grape,
      ...DISEASE_IDS_BY_CROP.peach,
    ];
    for (const id of ids) {
      assert.ok(
        CROP_ONSET_CATALOG[id],
        `missing onset catalog for ${id}`
      );
      assert.ok(CROP_ONSET_CATALOG[id].reference.length > 10);
      assert.ok(CROP_ONSET_CATALOG[id].latencyDaysMax >= CROP_ONSET_CATALOG[id].latencyDaysMin);
    }
    assert.equal(listCropOnsetCatalogIds().length, ids.length);
  });
});
