import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../disease/nasa-power";
import {
  ascosporePoolAtDate,
  buildAscosporePoolSnapshots,
} from "./apple-scab-ascospore-season-pool";
import { GUNMA_VALIDATION_SITES } from "./gunma-reference";
import {
  APPLE_SCAB_POOL_GOLDEN_EXPECTATIONS,
  APPLE_SCAB_POOL_GOLDEN_WINDOW,
  type AppleScabPoolGoldenCheckpoint,
} from "./validation-golden";

function assertCheckpoint(
  siteId: string,
  expected: AppleScabPoolGoldenCheckpoint,
  snap: ReturnType<typeof ascosporePoolAtDate>
) {
  assert.ok(snap, `${siteId} ${expected.queryDate}: snapshot missing`);
  if (expected.snapDate) {
    assert.equal(snap.date, expected.snapDate);
  }
  assert.equal(snap.remainingPercent, expected.remainingPercent);
  assert.equal(snap.cumulativeReleasedPercent, expected.cumulativeReleasedPercent);
  assert.equal(snap.rainEventsProcessed, expected.rainEventsProcessed);
}

describe("apple-scab-ascospore-pool integration (Gunma golden)", () => {
  const { greenTip, seasonEnd } = APPLE_SCAB_POOL_GOLDEN_WINDOW;

  for (const site of GUNMA_VALIDATION_SITES) {
    it(
      `${site.label} ${site.lat}/${site.lon} — pool depletion matches golden`,
      { timeout: 120_000 },
      async () => {
        const expectedList = APPLE_SCAB_POOL_GOLDEN_EXPECTATIONS[site.id];
        assert.ok(expectedList?.length, `no golden for ${site.id}`);

        const [daily, hourly] = await Promise.all([
          fetchNasaPowerDaily(site.lat, site.lon, greenTip, seasonEnd),
          fetchNasaPowerHourly(site.lat, site.lon, greenTip, seasonEnd, {
            timeStandard: "LST",
          }),
        ]);
        assert.ok(daily.length > 30);
        assert.ok(hourly.length > 500);

        const snaps = buildAscosporePoolSnapshots(
          greenTip,
          "green_tip",
          daily,
          hourly
        );
        for (const expected of expectedList) {
          const snap = ascosporePoolAtDate(
            snaps,
            `${expected.queryDate}T18:00:00+09:00`
          );
          assertCheckpoint(site.id, expected, snap);
        }
      }
    );
  }
});
