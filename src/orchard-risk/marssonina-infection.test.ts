import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listMarssoninaQualifyingPeriods,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "./marssonina-infection";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import { NASA_HOURLY_MAX_DAYS_MARSSONINA } from "./marssonina-constants";

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

    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-25");
    const search = searchPrimaryMarssoninaInfection(series, win, false);
    assert.equal(search.primary?.infectionDate, "2026-05-12");
    assert.equal(search.candidateCount, 2);
  });

  it("excludes periods before bloom start", () => {
    const before = Array.from({ length: 6 }, (_, i) =>
      wetHour("2026-04-20", 8 + i, 15)
    );
    const events = listMarssoninaQualifyingPeriods(before, "2026-05-01");
    assert.equal(events.length, 0);
  });

  it("marks partial coverage when bloom older than max days", () => {
    const yesterday = "2026-11-08";
    const bloom = addDaysBack(yesterday, NASA_HOURLY_MAX_DAYS_MARSSONINA + 10);
    const win = resolveMarssoninaNasaWindow(bloom, yesterday);
    assert.equal(win.coverage, "partial");
    assert.ok(win.fetchStart > bloom);
  });

  it("no candidate with full coverage -> no_infection_event", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-20");
    const dry = Array.from({ length: 24 }, (_, i) =>
      dryHour("2026-05-10", i % 24, 20)
    );
    const res = searchPrimaryMarssoninaInfection(dry, win, false);
    assert.equal(res.marssoninaStatus, "no_infection_event");
  });

  it("no candidate with partial coverage -> insufficient_weather_coverage", () => {
    const yesterday = "2026-11-08";
    const bloom = addDaysBack(yesterday, NASA_HOURLY_MAX_DAYS_MARSSONINA + 5);
    const win = resolveMarssoninaNasaWindow(bloom, yesterday);
    const dry = Array.from({ length: 48 }, (_, i) =>
      dryHour(win.fetchStart, (8 + i) % 24, 20)
    );
    const res = searchPrimaryMarssoninaInfection(dry, win, false);
    assert.equal(res.marssoninaStatus, "insufficient_weather_coverage");
  });

  it("fetch failed is not no_infection_event", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-20");
    const res = searchPrimaryMarssoninaInfection([], win, true);
    assert.equal(res.marssoninaStatus, "insufficient_weather");
  });
});

function addDaysBack(end: string, days: number): string {
  const [y, m, d] = end.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
