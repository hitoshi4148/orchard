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

function precipWetHour(
  date: string,
  hour: number,
  temp: number,
  precip = 0.6
): HourlyWeatherRecord {
  const h = String(hour).padStart(2, "0");
  return {
    datetime: `${date}T${h}:00:00+09:00`,
    temperature: temp,
    humidity: 95,
    precipitation_mm: precip,
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

function addWetBlock(
  dayRows: HourlyWeatherRecord[],
  date: string,
  startHour: number,
  count: number,
  temp: number
) {
  for (let i = 0; i < count; i += 1) {
    const h = startHour + i;
    dayRows[h] = precipWetHour(date, h, temp);
  }
}

describe("marssonina-infection P2c+ Phase 2", () => {
  it("rejects precip-wet shorter than 6 hours on complete day", () => {
    const rows = fullDayHours("2026-05-10");
    addWetBlock(rows, "2026-05-10", 10, 3, 14);
    const events = listMarssoninaQualifyingPeriods(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase2"
    );
    assert.equal(events.length, 0);
  });

  it("rejects average temp below 13.8C", () => {
    const rows = fullDayHours("2026-05-10", 13.0);
    addWetBlock(rows, "2026-05-10", 10, 6, 13.0);
    const events = listMarssoninaQualifyingPeriods(
      rows,
      "2026-05-01",
      "2026-05-10",
      "phase2"
    );
    assert.equal(events.length, 0);
  });

  it("accepts when thresholds met on complete day", () => {
    const rows = fullDayHours("2026-05-10");
    addWetBlock(rows, "2026-05-10", 10, 6, 14.0);
    const events = listMarssoninaQualifyingPeriods(
      rows,
      "2026-05-01",
      "2026-05-10"
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].wetDurationHours, 8);
    assert.equal(events[0].wetnessRule, "precip_0.5mm_suzuki_phase2");
  });

  it("picks earliest qualifying precip day among multiple", () => {
    const day12 = fullDayHours("2026-05-12");
    addWetBlock(day12, "2026-05-12", 8, 6, 15);
    const day15 = fullDayHours("2026-05-15");
    const day20 = fullDayHours("2026-05-20");
    addWetBlock(day20, "2026-05-20", 8, 6, 15);
    const series = [...day12, ...day15, ...day20];
    const events = listMarssoninaQualifyingPeriods(
      series,
      "2026-05-01",
      "2026-05-20"
    );
    assert.equal(events.length, 2);
    assert.equal(events[0].infectionDate, "2026-05-12");

    const win = resolveMarssoninaNasaWindow("2026-05-10", "2026-05-20");
    const filled: HourlyWeatherRecord[] = [];
    for (let d = 10; d <= 20; d += 1) {
      const date = `2026-05-${String(d).padStart(2, "0")}`;
      if (d === 12 || d === 20) {
        const rows = fullDayHours(date);
        addWetBlock(rows, date, 8, 6, 15);
        filled.push(...rows);
      } else {
        filled.push(...fullDayHours(date));
      }
    }
    const search = searchPrimaryMarssoninaInfection(filled, win, false);
    assert.equal(search.primary?.infectionDate, "2026-05-12");
    assert.equal(search.candidateCount, 2);
    assert.equal(search.marssoninaStatus, "primary_infection_estimated");
  });

  it("excludes precip days before bloom start", () => {
    const rows = fullDayHours("2026-04-20");
    addWetBlock(rows, "2026-04-20", 8, 6, 15);
    const events = listMarssoninaQualifyingPeriods(
      rows,
      "2026-05-01",
      "2026-04-20"
    );
    assert.equal(events.length, 0);
  });

  it("resolves full exploration window from bloom to yesterday", () => {
    const win = resolveMarssoninaNasaWindow("2026-04-25", "2026-11-08");
    assert.equal(win.fetchStart, "2026-04-25");
    assert.equal(win.fetchEnd, "2026-11-08");
    assert.equal(win.requestedDays, 198);
  });

  it("partial coverage without qualifying complete day -> insufficient_weather_coverage", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-03");
    const incomplete = [...fullDayHours("2026-05-01").slice(0, 12)];
    const res = searchPrimaryMarssoninaInfection(incomplete, win, false);
    assert.equal(res.coverage, "partial");
    assert.equal(res.marssoninaStatus, "insufficient_weather_coverage");
  });

  it("partial coverage with qualifying day on complete calendar day", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-02");
    const day1 = fullDayHours("2026-05-01").slice(0, 10);
    const day2 = fullDayHours("2026-05-02");
    addWetBlock(day2, "2026-05-02", 8, 6, 15);
    const res = searchPrimaryMarssoninaInfection([...day1, ...day2], win, false);
    assert.equal(res.coverage, "partial");
    assert.equal(res.marssoninaStatus, "partial_infection_reference");
    assert.equal(res.primary?.infectionDate, "2026-05-02");
  });

  it("no candidate with full coverage -> no_infection_event", () => {
    const win = resolveMarssoninaNasaWindow("2026-05-01", "2026-05-02");
    const full = [...fullDayHours("2026-05-01"), ...fullDayHours("2026-05-02")];
    const res = searchPrimaryMarssoninaInfection(full, win, false);
    assert.equal(res.marssoninaStatus, "no_infection_event");
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
    assert.equal(listExpectedExplorationHourKeys("2026-05-01", "2026-05-02").length, 48);
  });
});
