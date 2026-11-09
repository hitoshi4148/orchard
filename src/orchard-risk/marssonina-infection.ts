import { HourlyWeatherRecord } from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import { findWetPeriods } from "../disease/wetness";
import {
  MARSSONINA_WET_AVG_TEMP_MIN_C,
  MARSSONINA_WET_DURATION_MIN_H,
  NASA_HOURLY_MAX_DAYS_MARSSONINA,
} from "./marssonina-constants";
import { MarssoninaOnsetStatus } from "./types";

export type WeatherCoverage = "full" | "partial";

export interface MarssoninaNasaWindow {
  bloomStart: string;
  fetchStart: string;
  fetchEnd: string;
  coverage: WeatherCoverage;
  requestedDays: number;
}

export interface MarssoninaInfectionEvent {
  infectionDate: string;
  periodStart: string;
  periodEnd: string;
  wetDurationHours: number;
  wetAvgTempC: number;
  leafWetIsEstimated: true;
}

export interface MarssoninaInfectionSearchResult {
  marssoninaStatus: MarssoninaOnsetStatus;
  coverage: WeatherCoverage;
  nasaWindow: MarssoninaNasaWindow;
  hourlyCount: number;
  primary: MarssoninaInfectionEvent | null;
  candidateCount: number;
}

function daysBetweenInclusive(start: string, end: string): number {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(ye, me - 1, de);
  return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

export function resolveMarssoninaNasaWindow(
  bloomStart: string,
  yesterday: string
): MarssoninaNasaWindow {
  const requestedDays = daysBetweenInclusive(bloomStart, yesterday);
  let fetchStart = bloomStart;
  let coverage: WeatherCoverage = "full";

  if (requestedDays > NASA_HOURLY_MAX_DAYS_MARSSONINA) {
    fetchStart = addDaysToDateString(
      yesterday,
      -(NASA_HOURLY_MAX_DAYS_MARSSONINA - 1)
    );
    coverage = "partial";
  }

  return {
    bloomStart,
    fetchStart,
    fetchEnd: yesterday,
    coverage,
    requestedDays,
  };
}

function datePartFromIso(iso: string): string {
  return iso.split("T")[0] ?? iso;
}

function filterHourlyForWindow(
  hourly: HourlyWeatherRecord[],
  fetchStart: string,
  fetchEnd: string
): HourlyWeatherRecord[] {
  return hourly.filter((row) => {
    const d = datePartFromIso(row.datetime);
    return d >= fetchStart && d <= fetchEnd;
  });
}

/** 閾値を満たし、感染候補日が開花始期以降の濡れ期間を列挙 */
export function listMarssoninaQualifyingPeriods(
  hourly: HourlyWeatherRecord[],
  bloomStart: string
): MarssoninaInfectionEvent[] {
  const periods = findWetPeriods(hourly);
  const events: MarssoninaInfectionEvent[] = [];

  for (const period of periods) {
    if (period.durationHours < MARSSONINA_WET_DURATION_MIN_H) {
      continue;
    }
    if (period.averageTemperature < MARSSONINA_WET_AVG_TEMP_MIN_C) {
      continue;
    }
    const infectionDate = datePartFromIso(period.endDateTime);
    if (infectionDate < bloomStart) {
      continue;
    }
    events.push({
      infectionDate,
      periodStart: period.startDateTime,
      periodEnd: period.endDateTime,
      wetDurationHours: period.durationHours,
      wetAvgTempC: Math.round(period.averageTemperature * 10) / 10,
      leafWetIsEstimated: true,
    });
  }

  events.sort((a, b) => a.infectionDate.localeCompare(b.infectionDate));
  return events;
}

const MIN_HOURLY_FOR_SEARCH = 12;

export function searchPrimaryMarssoninaInfection(
  hourly: HourlyWeatherRecord[],
  window: MarssoninaNasaWindow,
  fetchFailed: boolean
): MarssoninaInfectionSearchResult {
  const filtered = filterHourlyForWindow(
    hourly,
    window.fetchStart,
    window.fetchEnd
  );

  if (fetchFailed) {
    return {
      marssoninaStatus: "insufficient_weather",
      coverage: window.coverage,
      nasaWindow: window,
      hourlyCount: 0,
      primary: null,
      candidateCount: 0,
    };
  }

  if (filtered.length < MIN_HOURLY_FOR_SEARCH) {
    return {
      marssoninaStatus: "insufficient_weather",
      coverage: window.coverage,
      nasaWindow: window,
      hourlyCount: filtered.length,
      primary: null,
      candidateCount: 0,
    };
  }

  const candidates = listMarssoninaQualifyingPeriods(
    filtered,
    window.bloomStart
  );
  const primary = candidates[0] ?? null;

  if (primary) {
    return {
      marssoninaStatus: "primary_infection_estimated",
      coverage: window.coverage,
      nasaWindow: window,
      hourlyCount: filtered.length,
      primary,
      candidateCount: candidates.length,
    };
  }

  if (window.coverage === "partial") {
    return {
      marssoninaStatus: "insufficient_weather_coverage",
      coverage: window.coverage,
      nasaWindow: window,
      hourlyCount: filtered.length,
      primary: null,
      candidateCount: 0,
    };
  }

  return {
    marssoninaStatus: "no_infection_event",
    coverage: window.coverage,
    nasaWindow: window,
    hourlyCount: filtered.length,
    primary: null,
    candidateCount: 0,
  };
}
