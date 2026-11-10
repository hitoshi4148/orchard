import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import {
  evaluateMarssoninaPrecipDayPhase1,
  listQualifyingMarssoninaPrecipDays,
} from "./marssonina-precip-day";

function hour(
  date: string,
  h: number,
  temp: number,
  precip: number
): HourlyWeatherRecord {
  return {
    datetime: `${date}T${String(h).padStart(2, "0")}:00:00+09:00`,
    temperature: temp,
    humidity: 50,
    precipitation_mm: precip,
  };
}

function fullDayDry(date: string, temp = 20): HourlyWeatherRecord[] {
  return Array.from({ length: 24 }, (_, h) => hour(date, h, temp, 0));
}

describe("marssonina-precip-day Phase 1", () => {
  it("ignores RH-only hours (no precip wet)", () => {
    const rows = fullDayDry("2026-05-10").map((r, i) =>
      i >= 10 && i < 16
        ? { ...r, humidity: 99, precipitation_mm: 0 }
        : r
    );
    const q = listQualifyingMarssoninaPrecipDays(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase1"
    );
    assert.equal(q.length, 0);
  });

  it("rejects fewer than 6 precip-wet hours on a complete day", () => {
    const rows = fullDayDry("2026-05-10");
    for (let i = 10; i < 15; i += 1) {
      rows[i] = hour("2026-05-10", i, 14, 0.6);
    }
    const q = listQualifyingMarssoninaPrecipDays(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase1"
    );
    assert.equal(q.length, 0);
  });

  it("rejects average temp below 13.8C on complete day", () => {
    const rows = fullDayDry("2026-05-10");
    for (let i = 8; i < 14; i += 1) {
      rows[i] = hour("2026-05-10", i, 13.0, 0.6);
    }
    const q = listQualifyingMarssoninaPrecipDays(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase1"
    );
    assert.equal(q.length, 0);
  });

  it("qualifies complete day with 6+ precip-wet hours", () => {
    const rows = fullDayDry("2026-05-10");
    for (let i = 8; i < 14; i += 1) {
      rows[i] = hour("2026-05-10", i, 14.5, 0.6);
    }
    const q = listQualifyingMarssoninaPrecipDays(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase1"
    );
    assert.equal(q.length, 1);
    assert.equal(q[0].precipDay, "2026-05-10");
    assert.equal(q[0].wetDurationHours, 6);
  });

  it("splits cross-midnight rain into separate calendar days", () => {
    const day1 = fullDayDry("2026-05-10");
    for (let h = 22; h < 24; h += 1) {
      day1[h] = hour("2026-05-10", h, 14, 0.6);
    }
    const day2 = fullDayDry("2026-05-11");
    for (let h = 0; h < 3; h += 1) {
      day2[h] = hour("2026-05-11", h, 14, 0.6);
    }
    const stats10 = evaluateMarssoninaPrecipDayPhase1(
      "2026-05-10",
      new Map(day1.map((r) => [r.datetime.slice(0, 13), r]))
    );
    const stats11 = evaluateMarssoninaPrecipDayPhase1(
      "2026-05-11",
      new Map(day2.map((r) => [r.datetime.slice(0, 13), r]))
    );
    assert.equal(stats10.wetDurationHours, 2);
    assert.equal(stats11.wetDurationHours, 3);
    assert.equal(stats10.qualifies, false);
    assert.equal(stats11.qualifies, false);
    assert.equal(
      stats10.attributedWetHours.every(
        (w) => w.attributionPrecipDay === "2026-05-10"
      ),
      true
    );
  });

  it("marks day incomplete when hours missing (not treated as dry)", () => {
    const partial = Array.from({ length: 6 }, (_, i) =>
      hour("2026-05-10", 10 + i, 14, 0.6)
    );
    const q = listQualifyingMarssoninaPrecipDays(
      partial,
      "2026-05-01",
      "2026-05-10",
      "phase1"
    );
    assert.equal(q.length, 0);
  });

  it("marks incomplete when wet hour lacks temperature", () => {
    const rows = fullDayDry("2026-05-10");
    for (let i = 8; i < 14; i += 1) {
      rows[i] = {
        datetime: hour("2026-05-10", i, 14, 0.6).datetime,
        temperature: i === 9 ? null : 14.5,
        humidity: 50,
        precipitation_mm: 0.6,
      };
    }
    const q = listQualifyingMarssoninaPrecipDays(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase1"
    );
    assert.equal(q.length, 0);
  });
});
