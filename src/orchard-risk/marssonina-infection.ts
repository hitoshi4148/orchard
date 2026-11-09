import {
  fetchNasaPowerHourly,
  HourlyWeatherRecord,
} from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import { findWetPeriods } from "../disease/wetness";
import {
  MARSSONINA_WET_AVG_TEMP_MIN_C,
  MARSSONINA_WET_DURATION_MIN_H,
  NASA_HOURLY_API_BUFFER_DAYS,
} from "./marssonina-constants";
import { MarssoninaOnsetStatus } from "./types";

export type WeatherCoverage = "full" | "partial";

export interface MarssoninaNasaWindow {
  bloomStart: string;
  /** 探索上の開始（開花始期） */
  fetchStart: string;
  /** 探索上の終了（昨日） */
  fetchEnd: string;
  /** NASA API リクエスト開始（バッファ付き） */
  nasaApiStart: string;
  /** NASA API リクエスト終了（バッファ付き） */
  nasaApiEnd: string;
  coverage: WeatherCoverage;
  requestedDays: number;
  expectedExplorationHours: number;
}

export interface MarssoninaInfectionEvent {
  /** 候補日（濡れ期間終了日・JST）。論文定義との一致は未確認 */
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

/** 開花始期〜昨日を一括探索する窓（120 日切り捨てなし） */
export function resolveMarssoninaNasaWindow(
  bloomStart: string,
  yesterday: string
): MarssoninaNasaWindow {
  const requestedDays = daysBetweenInclusive(bloomStart, yesterday);
  return {
    bloomStart,
    fetchStart: bloomStart,
    fetchEnd: yesterday,
    nasaApiStart: addDaysToDateString(
      bloomStart,
      -NASA_HOURLY_API_BUFFER_DAYS
    ),
    nasaApiEnd: addDaysToDateString(yesterday, NASA_HOURLY_API_BUFFER_DAYS),
    coverage: "full",
    requestedDays,
    expectedExplorationHours: requestedDays * 24,
  };
}

export async function fetchMarssoninaExplorationHourly(
  latitude: number,
  longitude: number,
  window: MarssoninaNasaWindow
): Promise<HourlyWeatherRecord[]> {
  return fetchNasaPowerHourly(
    latitude,
    longitude,
    window.nasaApiStart,
    window.nasaApiEnd,
    { timeStandard: "UTC" }
  );
}

function datePartFromIso(iso: string): string {
  return iso.split("T")[0] ?? iso;
}

function hourKeyFromIso(iso: string): string {
  return iso.slice(0, 13);
}

/** 開花始期 00:00〜探索終了 23:00（JST）の時刻キーを列挙 */
export function listExpectedExplorationHourKeys(
  bloomStart: string,
  explorationEnd: string
): string[] {
  const keys: string[] = [];
  let d = bloomStart;
  while (d <= explorationEnd) {
    for (let h = 0; h < 24; h += 1) {
      keys.push(`${d}T${String(h).padStart(2, "0")}`);
    }
    d = addDaysToDateString(d, 1);
  }
  return keys;
}

export function filterHourlyForExploration(
  hourly: HourlyWeatherRecord[],
  bloomStart: string,
  explorationEnd: string
): HourlyWeatherRecord[] {
  return hourly
    .filter((row) => {
      const d = datePartFromIso(row.datetime);
      return d >= bloomStart && d <= explorationEnd;
    })
    .sort(
      (a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
}

export function assessExplorationHourlyCompleteness(
  hourly: HourlyWeatherRecord[],
  bloomStart: string,
  explorationEnd: string
): {
  coverage: WeatherCoverage;
  expectedHours: number;
  presentHours: number;
  missingHourKeys: string[];
} {
  const expectedKeys = listExpectedExplorationHourKeys(
    bloomStart,
    explorationEnd
  );
  const present = new Set(hourly.map((r) => hourKeyFromIso(r.datetime)));
  const missingHourKeys = expectedKeys.filter((k) => !present.has(k));
  const coverage: WeatherCoverage =
    missingHourKeys.length === 0 ? "full" : "partial";
  return {
    coverage,
    expectedHours: expectedKeys.length,
    presentHours: expectedKeys.length - missingHourKeys.length,
    missingHourKeys,
  };
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
  if (fetchFailed) {
    return {
      marssoninaStatus: "insufficient_weather",
      coverage: "partial",
      nasaWindow: { ...window, coverage: "partial" },
      hourlyCount: 0,
      primary: null,
      candidateCount: 0,
    };
  }

  const filtered = filterHourlyForExploration(
    hourly,
    window.fetchStart,
    window.fetchEnd
  );
  const completeness = assessExplorationHourlyCompleteness(
    filtered,
    window.fetchStart,
    window.fetchEnd
  );
  const coverage = completeness.coverage;

  if (filtered.length < MIN_HOURLY_FOR_SEARCH) {
    return {
      marssoninaStatus: "insufficient_weather",
      coverage,
      nasaWindow: { ...window, coverage },
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
  const nasaWindow = { ...window, coverage };

  if (coverage === "partial") {
    if (primary) {
      return {
        marssoninaStatus: "partial_infection_reference",
        coverage,
        nasaWindow,
        hourlyCount: filtered.length,
        primary,
        candidateCount: candidates.length,
      };
    }
    return {
      marssoninaStatus: "insufficient_weather_coverage",
      coverage,
      nasaWindow,
      hourlyCount: filtered.length,
      primary: null,
      candidateCount: 0,
    };
  }

  if (primary) {
    return {
      marssoninaStatus: "primary_infection_estimated",
      coverage,
      nasaWindow,
      hourlyCount: filtered.length,
      primary,
      candidateCount: candidates.length,
    };
  }

  return {
    marssoninaStatus: "no_infection_event",
    coverage,
    nasaWindow,
    hourlyCount: filtered.length,
    primary: null,
    candidateCount: 0,
  };
}
