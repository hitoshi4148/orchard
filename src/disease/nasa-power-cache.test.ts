import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNasaPowerCacheKey,
  computeNasaPowerCacheTtlSeconds,
} from "./nasa-power-cache";

describe("nasa-power-cache", () => {
  it("builds stable cache keys", () => {
    const a = buildNasaPowerCacheKey(
      "hourly",
      36.39,
      139.06,
      "2026-04-01",
      "2026-11-08",
      "UTC"
    );
    const b = buildNasaPowerCacheKey(
      "hourly",
      36.39,
      139.06,
      "2026-04-01",
      "2026-11-08",
      "UTC"
    );
    assert.equal(a, b);
    assert.match(a, /nasa-power\/v1\/hourly/);
    assert.match(a, /ts=UTC/);
  });

  it("uses long TTL when range ends before yesterday", () => {
    assert.equal(computeNasaPowerCacheTtlSeconds("2020-01-01"), 7 * 24 * 60 * 60);
  });

  it("uses short TTL when range includes recent days", () => {
    const farFuture = "2099-12-31";
    assert.equal(computeNasaPowerCacheTtlSeconds(farFuture), 3 * 60 * 60);
  });
});
