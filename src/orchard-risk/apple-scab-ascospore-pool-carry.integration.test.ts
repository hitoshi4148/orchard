import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import { fetchNasaPowerDaily, fetchNasaPowerHourly } from "../disease/nasa-power";
import {
  ascosporePoolAtDate,
  buildAscosporePoolSnapshots,
  computeAscosporePoolCarryInFromDaily,
} from "./apple-scab-ascospore-season-pool";
import { GUNMA_VALIDATION_SITES } from "./gunma-reference";
import {
  APPLE_SCAB_POOL_GOLDEN_EXPECTATIONS,
  APPLE_SCAB_POOL_GOLDEN_WINDOW,
  type AppleScabPoolGoldenCheckpoint,
} from "./validation-golden";

/** forecast.ts の枯渇プール hourly 遡及（本番と同じ） */
const POOL_HOURLY_LOOKBACK_DAYS = 75;

const REMAINING_TOLERANCE = 2.5;
const CUMULATIVE_TOLERANCE = 2.5;
const EVENT_TOLERANCE = 2;

function assertNear(
  siteId: string,
  label: string,
  actual: number,
  expected: number,
  tolerance: number
) {
  const diff = Math.abs(actual - expected);
  assert.ok(
    diff <= tolerance,
    `${siteId} ${label}: expected ${expected}, got ${actual} (Δ${diff})`
  );
}

function assertCheckpointNear(
  siteId: string,
  expected: AppleScabPoolGoldenCheckpoint,
  snap: ReturnType<typeof ascosporePoolAtDate>
) {
  assert.ok(snap, `${siteId} ${expected.queryDate}: snapshot missing`);
  assertNear(
    siteId,
    "remaining",
    snap.remainingPercent,
    expected.remainingPercent,
    REMAINING_TOLERANCE
  );
  assertNear(
    siteId,
    "cumulative",
    snap.cumulativeReleasedPercent,
    expected.cumulativeReleasedPercent,
    CUMULATIVE_TOLERANCE
  );
  assertNear(
    siteId,
    "rainEvents",
    snap.rainEventsProcessed,
    expected.rainEventsProcessed,
    EVENT_TOLERANCE
  );
}

describe("apple-scab pool carry-in vs full hourly (Gunma spring golden)", () => {
  const { greenTip, seasonEnd } = APPLE_SCAB_POOL_GOLDEN_WINDOW;
  const poolHourlyFrom = addDaysToDateString(
    seasonEnd,
    -(POOL_HOURLY_LOOKBACK_DAYS - 1)
  );

  for (const site of GUNMA_VALIDATION_SITES) {
    it(
      `${site.label} — truncated+Carry matches full within tolerance`,
      { timeout: 180_000 },
      async () => {
        const expectedList = APPLE_SCAB_POOL_GOLDEN_EXPECTATIONS[site.id];
        assert.ok(expectedList?.length);

        const [daily, hourly] = await Promise.all([
          fetchNasaPowerDaily(site.lat, site.lon, greenTip, seasonEnd),
          fetchNasaPowerHourly(site.lat, site.lon, greenTip, seasonEnd, {
            timeStandard: "LST",
          }),
        ]);

        const fullSnaps = buildAscosporePoolSnapshots(
          greenTip,
          "green_tip",
          daily,
          hourly
        );

        const hourlyTruncated = hourly.filter((h) => {
          const d = h.datetime.slice(0, 10);
          return d >= poolHourlyFrom;
        });
        const carry = computeAscosporePoolCarryInFromDaily(
          greenTip,
          "green_tip",
          daily,
          addDaysToDateString(poolHourlyFrom, -1),
          100
        );
        const truncSnaps = buildAscosporePoolSnapshots(
          greenTip,
          "green_tip",
          daily,
          hourlyTruncated,
          100,
          { windowStartDate: poolHourlyFrom, ...carry }
        );

        for (const expected of expectedList) {
          const full = ascosporePoolAtDate(
            fullSnaps,
            `${expected.queryDate}T18:00:00+09:00`
          );
          const trunc = ascosporePoolAtDate(
            truncSnaps,
            `${expected.queryDate}T18:00:00+09:00`
          );
          assert.ok(full && trunc);
          assertNear(
            site.id,
            `${expected.queryDate} remaining full≈trunc`,
            trunc!.remainingPercent,
            full!.remainingPercent,
            REMAINING_TOLERANCE
          );
          assertCheckpointNear(site.id, expected, trunc);
        }
      }
    );
  }
});
