import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ascosporeDiurnalDischargeFactor,
  computeAscosporeRainDischargeFactor,
} from "./apple-scab-ascospore-rain-release";

describe("apple-scab-ascospore-rain-release", () => {
  it("favors morning after overnight rain start", () => {
    const f = ascosporeDiurnalDischargeFactor(
      "2026-04-10T20:00:00+09:00",
      "2026-04-11T09:00:00+09:00"
    );
    assert.equal(f, 1);
  });

  it("lowers factor without recent rain", () => {
    const dry = Array.from({ length: 48 }, (_, i) => ({
      datetime: `2026-04-10T${String(i % 24).padStart(2, "0")}:00:00+09:00`,
      temperature: 15,
      humidity: 70,
      precipitation_mm: 0,
    }));
    const r = computeAscosporeRainDischargeFactor(
      dry,
      "2026-04-11T18:00:00+09:00"
    );
    assert.ok(r.releaseFactor <= 0.1);
  });

  it("raises factor during fresh rain", () => {
    const hours = [];
    for (let i = 0; i < 6; i += 1) {
      hours.push({
        datetime: `2026-04-11T${String(10 + i).padStart(2, "0")}:00:00+09:00`,
        temperature: 16,
        humidity: 95,
        precipitation_mm: 0.4,
      });
    }
    const r = computeAscosporeRainDischargeFactor(
      hours,
      "2026-04-11T15:00:00+09:00"
    );
    assert.ok(r.releaseFactor >= 0.85);
  });
});
