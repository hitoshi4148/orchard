import {
  fetchNasaPowerHourly,
  HourlyWeatherRecord,
} from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import {
  MARSSONINA_HOURLY_FETCH_CHUNK_DAYS,
  NASA_HOURLY_API_BUFFER_DAYS,
} from "./marssonina-constants";
import {
  listQualifyingMarssoninaPrecipDays,
  MarssoninaPrecipDayMode,
  MarssoninaPrecipDayStats,
} from "./marssonina-precip-day";
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
  /** 一次感染開始日（推定）: 条件を満たした最初の降水日（JST 暦日） */
  infectionDate: string;
  periodStart: string;
  periodEnd: string;
  wetDurationHours: number;
  wetAvgTempC: number;
  /** 時別 PRECTOTCORR ≥ 0.5 mm/h の時間数（当該降水日） */
  precipWetHourCount: number;
  /** 当該日の探索枠内欠測時刻数（欠測は乾燥扱いしない） */
  missingHourCount: number;
  leafWetIsEstimated: true;
  wetnessRule: "precip_0.5mm_phase1" | "precip_0.5mm_suzuki_phase2";
  weatherSource: "nasa_power_grid";
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

function mergeSortedHourly(
  chunks: HourlyWeatherRecord[][]
): HourlyWeatherRecord[] {
  const byKey = new Map<string, HourlyWeatherRecord>();
  for (const chunk of chunks) {
    for (const row of chunk) {
      byKey.set(row.datetime, row);
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
}

function chunkFetchRange(
  nasaStart: string,
  nasaEnd: string,
  chunkDays: number
): { apiStart: string; apiEnd: string }[] {
  const ranges: { apiStart: string; apiEnd: string }[] = [];
  let cursor = nasaStart;
  while (cursor <= nasaEnd) {
    const chunkEnd = addDaysToDateString(cursor, chunkDays - 1);
    const apiEnd = chunkEnd > nasaEnd ? nasaEnd : chunkEnd;
    ranges.push({ apiStart: cursor, apiEnd });
    cursor = addDaysToDateString(apiEnd, 1);
  }
  return ranges;
}

/**
 * 開花〜昨日をチャンク取得。一次感染候補が見つかったチャンク以降は省略（CPU 対策）。
 */
export async function fetchMarssoninaExplorationHourly(
  latitude: number,
  longitude: number,
  window: MarssoninaNasaWindow,
  mode: MarssoninaPrecipDayMode = "phase2"
): Promise<HourlyWeatherRecord[]> {
  const chunks: HourlyWeatherRecord[][] = [];

  for (const { apiStart, apiEnd } of chunkFetchRange(
    window.nasaApiStart,
    window.nasaApiEnd,
    MARSSONINA_HOURLY_FETCH_CHUNK_DAYS
  )) {
    const part = await fetchNasaPowerHourly(
      latitude,
      longitude,
      apiStart,
      apiEnd,
      { timeStandard: "UTC" }
    );
    chunks.push(part);
    const merged = mergeSortedHourly(chunks);
    const lastRow = merged[merged.length - 1];
    if (!lastRow) {
      continue;
    }
    const dataThrough = datePartFromIso(lastRow.datetime);
    const scanEnd =
      dataThrough < window.fetchEnd ? dataThrough : window.fetchEnd;
    const filtered = filterHourlyForExploration(
      merged,
      window.bloomStart,
      scanEnd
    );
    if (
      filtered.length >= 12 &&
      listMarssoninaQualifyingPeriods(
        filtered,
        window.bloomStart,
        scanEnd,
        mode
      ).length > 0
    ) {
      return filterHourlyForExploration(
        merged,
        window.bloomStart,
        window.fetchEnd
      );
    }
  }

  const merged = mergeSortedHourly(chunks);
  return filterHourlyForExploration(
    merged,
    window.bloomStart,
    window.fetchEnd
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
  const expectedHours = daysBetweenInclusive(bloomStart, explorationEnd) * 24;
  const present = new Set(hourly.map((r) => hourKeyFromIso(r.datetime)));
  const missingHourKeys: string[] = [];
  let presentHours = 0;
  let d = bloomStart;
  while (d <= explorationEnd) {
    for (let h = 0; h < 24; h += 1) {
      const k = `${d}T${String(h).padStart(2, "0")}`;
      if (present.has(k)) {
        presentHours += 1;
      } else {
        missingHourKeys.push(k);
      }
    }
    d = addDaysToDateString(d, 1);
  }
  const coverage: WeatherCoverage =
    missingHourKeys.length === 0 ? "full" : "partial";
  return {
    coverage,
    expectedHours,
    presentHours,
    missingHourKeys,
  };
}

function statsToInfectionEvent(
  day: MarssoninaPrecipDayStats,
  wetnessRule: MarssoninaInfectionEvent["wetnessRule"]
): MarssoninaInfectionEvent {
  return {
    infectionDate: day.precipDay,
    periodStart: day.periodStart ?? day.precipDay,
    periodEnd: day.periodEnd ?? day.precipDay,
    wetDurationHours: day.wetDurationHours,
    wetAvgTempC: day.wetAvgTempC ?? 0,
    precipWetHourCount: day.precipWetHourCount,
    missingHourCount: day.missingHourCount,
    leafWetIsEstimated: true,
    wetnessRule,
    weatherSource: "nasa_power_grid",
  };
}

/** P2c+ Phase 1: 開花始期以降で条件を満たした降水日を昇順で列挙 */
export function listMarssoninaQualifyingPeriods(
  hourly: HourlyWeatherRecord[],
  bloomStart: string,
  explorationEnd?: string,
  mode: MarssoninaPrecipDayMode = "phase2"
): MarssoninaInfectionEvent[] {
  const end =
    explorationEnd ??
    (hourly.length > 0
      ? datePartFromIso(hourly[hourly.length - 1].datetime)
      : bloomStart);
  const qualifying = listQualifyingMarssoninaPrecipDays(
    hourly,
    bloomStart,
    end,
    mode
  );
  const rule =
    mode === "phase1"
      ? "precip_0.5mm_phase1"
      : "precip_0.5mm_suzuki_phase2";
  return qualifying.map((d) => statsToInfectionEvent(d, rule));
}

const MIN_HOURLY_FOR_SEARCH = 12;

export function searchPrimaryMarssoninaInfection(
  hourly: HourlyWeatherRecord[],
  window: MarssoninaNasaWindow,
  fetchFailed: boolean,
  mode: MarssoninaPrecipDayMode = "phase2"
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
    window.bloomStart,
    window.fetchEnd,
    mode
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
