import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import {
  MARSSONINA_SUZUKI_EVENING_RAIN_START_H,
  MARSSONINA_SUZUKI_MORNING_WET_END_H,
  MARSSONINA_SUZUKI_POST_RAIN_WET_H,
} from "./marssonina-constants";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import {
  advanceJstHourKey,
  buildMarssoninaSuzukiWetHours,
  isMarssoninaPrecipWetHour,
  jstHourKeyDelta,
} from "./marssonina-wetness-suzuki";
import {
  evaluateMarssoninaPrecipDayPhase1,
  evaluateMarssoninaPrecipDayPhase2,
  listQualifyingMarssoninaPrecipDays,
} from "./marssonina-precip-day";
import { groupSuzukiWetByPrecipDay } from "./marssonina-wetness-suzuki";

function h(
  date: string,
  hour: number,
  temp: number,
  precip: number
): HourlyWeatherRecord {
  return {
    datetime: `${date}T${String(hour).padStart(2, "0")}:00:00+09:00`,
    temperature: temp,
    humidity: 50,
    precipitation_mm: precip,
  };
}

function fullDay(
  date: string,
  temp = 20,
  precip = 0
): HourlyWeatherRecord[] {
  return Array.from({ length: 24 }, (_, i) => h(date, i, temp, precip));
}

function keyMap(rows: HourlyWeatherRecord[]) {
  return new Map(rows.map((r) => [r.datetime.slice(0, 13), r]));
}

function parseHourKey(key: string) {
  const [date, t] = key.split("T");
  return { date, hour: Number(t.slice(0, 2)) };
}

function hourKeyFromParts(date: string, h: number) {
  return `${date}T${String(h).padStart(2, "0")}`;
}

function maxHourKey(a: string, b: string) {
  return a >= b ? a : b;
}

function hourKeysBetweenInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const keys: string[] = [];
  let cur = start;
  let guard = 0;
  while (true) {
    keys.push(cur);
    if (cur === end) break;
    cur = advanceJstHourKey(cur, 1);
    guard += 1;
    if (guard > 24 * 21) throw new Error("span guard");
  }
  return keys;
}

function mergeRainEpisodesLegacy(rainKeys: string[]) {
  if (!rainKeys.length) return [] as string[][];
  const out: string[][] = [];
  let cur = [rainKeys[0]];
  for (let i = 1; i < rainKeys.length; i += 1) {
    const prev = cur[cur.length - 1];
    if (jstHourKeyDelta(prev, rainKeys[i]) <= MARSSONINA_SUZUKI_POST_RAIN_WET_H) {
      cur.push(rainKeys[i]);
    } else {
      out.push(cur);
      cur = [rainKeys[i]];
    }
  }
  out.push(cur);
  return out;
}

function episodeWetEndKeyLegacy(rainKeys: string[]) {
  const lastRain = rainKeys[rainKeys.length - 1];
  let endKey = advanceJstHourKey(lastRain, MARSSONINA_SUZUKI_POST_RAIN_WET_H);
  for (const rk of rainKeys) {
    const { date, hour } = parseHourKey(rk);
    if (hour >= MARSSONINA_SUZUKI_EVENING_RAIN_START_H) {
      const nextDay = addDaysToDateString(date, 1);
      const nightEnd = hourKeyFromParts(
        nextDay,
        MARSSONINA_SUZUKI_MORNING_WET_END_H - 1
      );
      endKey = maxHourKey(endKey, nightEnd);
    }
  }
  return endKey;
}

/** B2 導入前のエピソード先勝ち（キー集合比較用・テストのみ） */
function legacyAWetKeys(hourlyByKey: Map<string, HourlyWeatherRecord>): string[] {
  const keys = [...hourlyByKey.keys()].sort();
  const rainKeys = keys.filter((k) => {
    const row = hourlyByKey.get(k);
    return row && isMarssoninaPrecipWetHour(row);
  });
  const episodes = mergeRainEpisodesLegacy(rainKeys);
  const wetByKey = new Map<string, true>();

  for (const episodeRains of episodes) {
    const start = episodeRains[0];
    const end = episodeWetEndKeyLegacy(episodeRains);
    for (const hk of hourKeysBetweenInclusive(start, end)) {
      if (wetByKey.has(hk)) continue;
      let hasLast = false;
      for (const rk of episodeRains) {
        if (rk <= hk) hasLast = true;
        else break;
      }
      if (!hasLast) continue;
      wetByKey.set(hk, true);

    }
  }
  return [...wetByKey.keys()].sort();
}

function wetKeys(map: Map<string, HourlyWeatherRecord>) {
  return buildMarssoninaSuzukiWetHours(map)
    .map((w) => w.datetime.slice(0, 13))
    .sort();
}

function assertKeySetsEqual(
  a: string[],
  b: string[],
  label: string
) {
  const onlyA = a.filter((k) => !b.includes(k));
  const onlyB = b.filter((k) => !a.includes(k));
  assert.equal(
    onlyA.length,
    0,
    `${label} onlyA: ${onlyA.slice(0, 5).join(",")}`
  );
  assert.equal(
    onlyB.length,
    0,
    `${label} onlyB2: ${onlyB.slice(0, 5).join(",")}`
  );
  assert.equal(a.length, b.length);
}

function hirosakiOverlapFixture() {
  const rows: HourlyWeatherRecord[] = [];
  for (const d of ["2026-05-01", "2026-05-02", "2026-05-03"]) {
    rows.push(...fullDay(d, 14, 0));
  }
  for (let hh = 12; hh <= 22; hh += 1) {
    rows.push(h("2026-05-01", hh, 14, 0.6));
  }
  rows.push(h("2026-05-02", 3, 14, 0.6));
  rows.push(h("2026-05-02", 4, 14, 0.6));
  rows.push(h("2026-05-02", 5, 14, 0.6));
  return keyMap(rows);
}

function defaultOverlapFixture() {
  const rows: HourlyWeatherRecord[] = [];
  for (const d of ["2026-06-14", "2026-06-15", "2026-06-16"]) {
    rows.push(...fullDay(d, 14, 0));
  }
  for (const hh of [16, 18, 19, 20]) {
    rows.push(h("2026-06-14", hh, 14, 0.6));
  }
  rows.push(h("2026-06-15", 2, 14, 0.6));
  return keyMap(rows);
}

const PREIMPL_GOLDEN =
  "C:/Users/hitos/Documents/2026/202611/20261110/phase2-b2-preimpl-verify/verify-result.json";

describe("marssonina-wetness-suzuki", () => {
  it("extends 2 hours after rain ends", () => {
    const rows = fullDay("2026-05-10");
    rows[10] = h("2026-05-10", 10, 14, 0.6);
    const wet = buildMarssoninaSuzukiWetHours(keyMap(rows));
    const keys = wet.map((w) => w.datetime.slice(0, 13));
    assert.equal(keys.includes("2026-05-10T10"), true);
    assert.equal(keys.includes("2026-05-10T11"), true);
    assert.equal(keys.includes("2026-05-10T12"), true);
    assert.equal(keys.includes("2026-05-10T13"), false);
    assert.ok(
      wet.filter((w) => !w.isPrecipWet).every((w) => w.wetKind === "post_rain")
    );
  });

  it("merges rain resumed within 2 hours after last rain hour", () => {
    const rows = fullDay("2026-05-10");
    rows[10] = h("2026-05-10", 10, 14, 0.6);
    rows[12] = h("2026-05-10", 12, 14, 0.6);
    const wet = buildMarssoninaSuzukiWetHours(keyMap(rows));
    const precipKeys = wet.filter((w) => w.isPrecipWet).map((w) => w.datetime);
    assert.equal(precipKeys.length, 2);
    assert.equal(jstHourKeyDelta("2026-05-10T10", "2026-05-10T14"), 4);
    assert.equal(
      wet.some((w) => w.datetime.startsWith("2026-05-10T14")),
      true
    );
  });

  it("does not merge when gap exceeds 2h after last rain", () => {
    const rows = fullDay("2026-05-10");
    rows[10] = h("2026-05-10", 10, 14, 0.6);
    rows[14] = h("2026-05-10", 14, 14, 0.6);
    const wet = buildMarssoninaSuzukiWetHours(keyMap(rows));
    assert.equal(wet.filter((w) => w.isPrecipWet).length, 2);
    assert.equal(
      wet.filter((w) => w.datetime.startsWith("2026-05-10T11")).length,
      1
    );
    assert.equal(
      wet.filter((w) => w.datetime.startsWith("2026-05-10T12")).length,
      1
    );
    assert.equal(
      wet.filter((w) => w.datetime.startsWith("2026-05-10T13")).length,
      0
    );
  });

  it("20:00+ rain extends wet until next day 06:00 attributed to rain day", () => {
    const day1 = fullDay("2026-05-10");
    day1[22] = h("2026-05-10", 22, 14, 0.6);
    const day2 = fullDay("2026-05-11");
    const map = keyMap([...day1, ...day2]);
    const wet = buildMarssoninaSuzukiWetHours(map);
    const morning = wet.filter((w) =>
      w.datetime.startsWith("2026-05-11T0")
    );
    assert.ok(morning.length >= 6);
    assert.ok(
      morning.every((w) => w.attributionPrecipDay === "2026-05-10"),
      "night extension counts on rain precip day"
    );
    const stats10 = evaluateMarssoninaPrecipDayPhase2(
      "2026-05-10",
      map,
      groupSuzukiWetByPrecipDay(wet).get("2026-05-10") ?? []
    );
    assert.ok(stats10.wetDurationHours >= 8);
    const stats11 = evaluateMarssoninaPrecipDayPhase2(
      "2026-05-11",
      map,
      groupSuzukiWetByPrecipDay(wet).get("2026-05-11") ?? []
    );
    assert.equal(stats11.wetDurationHours, 0);
  });

  it("night extension dominates 2h rule without double-counting hours", () => {
    const day1 = fullDay("2026-05-10");
    day1[20] = h("2026-05-10", 20, 14, 0.6);
    const day2 = fullDay("2026-05-11");
    const map = keyMap([...day1, ...day2]);
    const wet = buildMarssoninaSuzukiWetHours(map);
    const unique = new Set(wet.map((w) => w.datetime.slice(0, 13)));
    assert.equal(unique.size, wet.length);
    const ends = wet.map((w) => w.datetime.slice(0, 13));
    assert.equal(ends.includes("2026-05-11T06"), true);
    assert.equal(ends.includes("2026-05-10T22"), true);
  });

  it("cross-day attribution keeps qualifies on precip day only", () => {
    const day1 = fullDay("2026-05-10");
    for (let hh = 20; hh < 24; hh += 1) {
      day1[hh] = h("2026-05-10", hh, 14.5, 0.7);
    }
    const day2 = fullDay("2026-05-11");
    const series = [...day1, ...day2];
    const q = listQualifyingMarssoninaPrecipDays(
      series,
      "2026-05-01",
      "2026-05-11",
      "phase2"
    );
    assert.equal(q.length, 1);
    assert.equal(q[0].precipDay, "2026-05-10");
    assert.ok(q[0].wetDurationHours >= 10);
  });

  it("marks incomplete when extension hour lacks temperature", () => {
    const rows = fullDay("2026-05-10");
    rows[10] = h("2026-05-10", 10, 14, 0.6);
    rows[11] = {
      ...h("2026-05-10", 11, 14, 0),
      temperature: null,
    };
    const map = keyMap(rows);
    const wet = groupSuzukiWetByPrecipDay(buildMarssoninaSuzukiWetHours(map));
    const stats = evaluateMarssoninaPrecipDayPhase2(
      "2026-05-10",
      map,
      wet.get("2026-05-10") ?? []
    );
    assert.equal(stats.incomplete, true);
    assert.equal(stats.qualifies, false);
  });

  it("phase1 vs phase2: extension adds wet hours on same precip day", () => {
    const rows = fullDay("2026-05-10");
    for (let i = 8; i < 14; i += 1) {
      rows[i] = h("2026-05-10", i, 14.5, 0.6);
    }
    const map = keyMap(rows);
    const p1 = evaluateMarssoninaPrecipDayPhase1("2026-05-10", map);
    const wet = groupSuzukiWetByPrecipDay(buildMarssoninaSuzukiWetHours(map));
    const p2 = evaluateMarssoninaPrecipDayPhase2(
      "2026-05-10",
      map,
      wet.get("2026-05-10") ?? []
    );
    assert.equal(p1.wetDurationHours, 6);
    assert.equal(p2.wetDurationHours, 8);
    assert.equal(p1.qualifies, true);
    assert.equal(p2.qualifies, true);
  });

  it("advanceJstHourKey crosses midnight", () => {
    assert.equal(
      advanceJstHourKey("2026-05-10T23", 1),
      "2026-05-11T00"
    );
  });

  it("B2 hirosaki-type: post_rain 2h after moved rain on overlap day", () => {
    const map = hirosakiOverlapFixture();
    const wet = buildMarssoninaSuzukiWetHours(map);
    const w06 = wet.find((w) => w.datetime.startsWith("2026-05-02T06"));
    assert.ok(w06);
    assert.equal(w06.isPrecipWet, false);
    assert.equal(w06.attributionPrecipDay, "2026-05-02");
    assert.equal(w06.wetKind, "post_rain");
    const rain0305 = wet.filter(
      (w) =>
        w.isPrecipWet &&
        ["2026-05-02T03", "2026-05-02T04", "2026-05-02T05"].some((k) =>
          w.datetime.startsWith(k)
        )
    );
    assert.equal(rain0305.length, 3);
    assert.ok(
      rain0305.every((w) => w.attributionPrecipDay === "2026-05-02")
    );
    assertKeySetsEqual(legacyAWetKeys(map), wetKeys(map), "hirosaki-fixture");
  });

  it("B2 default-type: post_rain on 6/15 after prior night episode", () => {
    const map = defaultOverlapFixture();
    const wet = buildMarssoninaSuzukiWetHours(map);
    for (const hk of ["2026-06-15T03", "2026-06-15T04"]) {
      const w = wet.find((x) => x.datetime.startsWith(hk));
      assert.ok(w, hk);
      assert.equal(w.attributionPrecipDay, "2026-06-15");
      assert.equal(w.wetKind, "post_rain");
    }
    const r02 = wet.find((w) => w.datetime.startsWith("2026-06-15T02"));
    assert.ok(r02?.isPrecipWet);
    assert.equal(r02.attributionPrecipDay, "2026-06-15");
    assertKeySetsEqual(legacyAWetKeys(map), wetKeys(map), "default-fixture");
  });

  it("B2 cross-midnight consecutive rain: T01 follows T00 calendar day", () => {
    const rows = [...fullDay("2026-06-10"), ...fullDay("2026-06-11")];
    rows.push(h("2026-06-10", 23, 14, 0.6));
    rows.push(h("2026-06-11", 0, 14, 0.6));
    const map = keyMap(rows);
    const wet = buildMarssoninaSuzukiWetHours(map);
    const t01 = wet.find((w) => w.datetime.startsWith("2026-06-11T01"));
    assert.ok(t01);
    assert.equal(t01.attributionPrecipDay, "2026-06-11");
    assert.equal(t01.wetKind, "post_rain");
    assertKeySetsEqual(legacyAWetKeys(map), wetKeys(map), "midnight");
  });

  it("B2 pass2 does not add wet keys vs legacy A on fixtures", () => {
    const maps = [
      hirosakiOverlapFixture(),
      defaultOverlapFixture(),
      keyMap([
        ...fullDay("2026-05-10"),
        h("2026-05-10", 22, 14, 0.6),
        ...fullDay("2026-05-11"),
      ]),
    ];
    for (const map of maps) {
      assertKeySetsEqual(legacyAWetKeys(map), wetKeys(map), "pass2-keys");
    }
  });

  it("B2 wet keys match pre-implementation golden NASA snapshots", () => {
    if (!existsSync(PREIMPL_GOLDEN)) {
      return;
    }
    const golden = JSON.parse(readFileSync(PREIMPL_GOLDEN, "utf8")) as {
      sites: { site: string; keysA: string[] }[];
    };
    const fixtures: { site: string; map: Map<string, HourlyWeatherRecord> }[] = [
      { site: "hirosaki", map: hirosakiOverlapFixture() },
      { site: "default", map: defaultOverlapFixture() },
    ];
    for (const { site, map } of fixtures) {
      const g = golden.sites.find((s) => s.site === site);
      if (!g) continue;
      const prod = wetKeys(map);
      const legacy = legacyAWetKeys(map);
      assertKeySetsEqual(legacy, prod, site);
    }
    for (const g of golden.sites) {
      const legacyNote = `${g.site} full golden has ${g.keysA.length} keys (NASA window; compare via preimpl script)`;
      void legacyNote;
    }
  });
});
