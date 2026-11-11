import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAppleScabPrimarySeason,
  getAppleScabSeasonWindow,
  isJstDateInAppleScabWindow,
  resolveAppleScabLatBand,
} from "./apple-scab-season";

describe("apple-scab-season", () => {
  it("resolves lat bands", () => {
    assert.equal(resolveAppleScabLatBand(40.82), "north");
    assert.equal(resolveAppleScabLatBand(36.39), "central");
    assert.equal(resolveAppleScabLatBand(33.5), "south");
  });

  it("allows Mills season in summer central band", () => {
    const win = getAppleScabSeasonWindow(36.39);
    assert.equal(
      isJstDateInAppleScabWindow("2026-05-20T18:00:00+09:00", win),
      true
    );
    const st = evaluateAppleScabPrimarySeason(
      36.39,
      "2026-05-20T18:00:00+09:00",
      "youngfruit"
    );
    assert.equal(st.inPrimarySeason, true);
  });

  it("blocks winter outside calendar", () => {
    const st = evaluateAppleScabPrimarySeason(
      36.39,
      "2026-11-11T18:00:00+09:00",
      "youngfruit"
    );
    assert.equal(st.inPrimarySeason, false);
    assert.match(st.reason, /升孢子期外/);
  });

  it("blocks harvest stage", () => {
    const st = evaluateAppleScabPrimarySeason(
      40.82,
      "2026-06-10T18:00:00+09:00",
      "harvest"
    );
    assert.equal(st.inPrimarySeason, false);
  });
});
