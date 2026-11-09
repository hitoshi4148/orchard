import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessExplorationHourlyCompleteness,
  filterHourlyForExploration,
  listMarssoninaQualifyingPeriods,
  listExpectedExplorationHourKeys,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "./marssonina-infection";
import { HourlyWeatherRecord } from "../disease/nasa-power";

function wetHour(date: string, hour: number, temp: number): HourlyWeatherRecord {
  const h = String(hour).padStart(2, "0");
  return {
    datetime: `${date}T${h}:00:00+09:00`,
    temperature: temp,
    humidity: 95,
    precipitation_mm: 0.2,
  };
}

function dryHour(date: string, hour: number, temp: number): HourlyWeatherRecord {
  const h = String(hour).padStart(2, "0");
  return {
    datetime: `${date}T${h}:00:00+09:00`,
    temperature: temp,
    humidity: 50,
    precipitation_mm: 0,
  };
}

function fullDayHours(date: string, temp = 20): HourlyWeatherRecord[] {
  return Array.from({ length: 24 }, (_, h) => dryHour(date, h, temp));
}

describe("marssonina-infection P2", () => {
  it("rejects wet period shorter than 6 hours", () => {
    const hourly = Array.from({ length: 5 }, (_, i) =>
      wetHour("2026-05-10", 10 + i, 14)
    );
    const events = listMarssoninaQualifyingPeriods(hourly, "2026-05-01");
    assert.equal(events.length, 0);
  });

  it("rejects average temp below 13.8C", () => {
    const hourly = Array.from({ length: 6 }, (_, i) =>
      wetHour("2026-05-10", 10 + i, 13.0)
    );
    const events = listMarssoninaQualifyingPeriods(hourly, "2026-05-01");
    assert.equal(events.length, 0);
  });

  it("accepts when both thresholds met", () => {
    const hourly = Array.from({ length: 6 }, (_, i) =>
      wetHour("2026-05-10", 10 + i, 14.0)
    );
    const events = listMarssoninaQualifyingPeriods(hourly, "2026-05-01");
    assert.equal(events.length, 1);
    assert.equal(events[0].wetDurationHours, 6);
  });

  it("picks earliest candidate among multiple", () => {
    const early = Array.from({ length: 6 }, (_, i) =>
      wetHour("2026-05-12", 8 + i, 15)
    );
    const gap = Array.from({ length: 3 }, (_, i) =>
      dryHour("2026-05-15", 10 + i, 20)
    );
    const late = Array.from({ length: 6 }, (_, i) =>
      wetHour("2026-05-20", 8 + i, 15)
    );
    const series = [...early, ...gap, ...late];
    const events = listMarssoninaQualifyingPeriods(series, "2026-05-01");
    assert.equal(events.length, 2);
    assert.equal(events[0].infectionDate, "2026-05-12");

    const win = resolveMarssoninaNasaWindow("2026-05-10", "2026-05-20");
    const filled: HourlyWeatherRecord[] = [];
    for (let d = 10; d <= 20; d += 1) {
      const date = `2026-05-${String(d).padStart(2, "0")}`;
      if (d === 12) {
        filled.push(...fullDayHours(date));
        for (let i = 0; i < 6; i++) filled.push(wetHour(date, 8 + i, 15));
        continue;
      }
      if (d === 15) {
        filled.push(...fullDayHours(date));
        continue;
      }
      if (d === 20) {
        filled.push(...fullDayHours(date));
        for (let i = 0; i < 6; i++) filled.push(wetHour(date, 8 + i, 15));
        continue;
      }
      filled.push(...fullDayHours(date));
    }
    const search = searchPrimaryMarssoninaInfection(filled, win, false);
    assert.equal(search.primary?.infectionDate, "2026-05-12");
    assert.equal(search.candidateCount, 2);
    assert.equal(search.marssoninaStatus, "primary_infection_estimated");
  });

  it("excludes periods before bloom start", () => {
    const before = Array.from({ length: 6 }, (_, i) =>
      wetHour("2026-04-20", 8 + i, 15)
    );
    const events = listMarssoninaQualifyingPeriods(before, "2026-05-01");
    assert.equal(events.length, 0);
  });

  it("resolves full exploration window from bloom to yesterday", () => {
    const win = resolveMarssoninaNasaWindow("2026-04-25", "2026-11-08");
    assert.equal(win.fetchStart, "2026-04-25");
    assert.equal(win.fetchEnd, "2026-11-08");
    assert.equal(win.coverage, "full");
    assert.equal(win.requestedDays, 198);
    assert.equal(win.nasaApiStart, "2026-04-24");
    assert.equal(win.nasaApiEnd, "2026-11-09");
  });

  it("partial data with candidate -> partial_infection_reference", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-03");
    const incomplete = [...fullDayHours("2026-05-01").slice(0, 12)];
    const res = searchPrimaryMarssoninaInfection(incomplete, win, false);
    assert.equal(res.coverage, "partial");
    assert.equal(res.marssoninaStatus, "insufficient_weather_coverage");
  });

  it("partial data with wet candidate uses reference status", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-02");
    const day1 = fullDayHours("2026-05-01");
    const wet = Array.from({ length: 6 }, (_, i) => wetHour("2026-05-02", 8 + i, 15));
    const partial = [...day1.slice(0, 10), ...wet];
    const res = searchPrimaryMarssoninaInfection(partial, win, false);
    assert.equal(res.coverage, "partial");
    assert.equal(res.marssoninaStatus, "partial_infection_reference");
    assert.ok(res.primary);
  });

  it("no candidate with full coverage -> no_infection_event", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-02");
    const full = [...fullDayHours("2026-05-01"), ...fullDayHours("2026-05-02")];
    const res = searchPrimaryMarssoninaInfection(full, win, false);
    assert.equal(res.marssoninaStatus, "no_infection_event");
    assert.equal(res.coverage, "full");
  });

  it("fetch failed is not no_infection_event", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-20");
    const res = searchPrimaryMarssoninaInfection([], win, true);
    assert.equal(res.marssoninaStatus, "insufficient_weather");
  });

  it("complete synthetic grid has no missing hours", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-02");
    const full = [...fullDayHours("2026-05-01"), ...fullDayHours("2026-05-02")];
    const filtered = filterHourlyForExploration(
      full,
      win.fetchStart,
      win.fetchEnd
    );
    const c = assessExplorationHourlyCompleteness(
      filtered,
      win.fetchStart,
      win.fetchEnd
    );
    assert.equal(c.missingHourKeys.length, 0);
    assert.equal(c.coverage, "full");
    assert.equal(listExpectedExplorationHourKeys("2026-05-01", "2026-05-02").length, 48);
  });
});

