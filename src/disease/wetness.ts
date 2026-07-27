import { HourlyWeatherRecord } from "./nasa-power";
import { WetPeriod } from "./types";

/** 降水量がこの値以上なら葉面濡れとみなす（mm/h） */
export const PRECIP_WET_THRESHOLD_MM = 0.1;

/** 相対湿度がこの値以上なら葉面濡れとみなす（%） */
export const RH_WET_THRESHOLD = 90;

/** 濡れ期間を結合する最大の乾燥ギャップ（時間） */
export const MAX_DRY_GAP_HOURS = 1;

function isValidHour(row: HourlyWeatherRecord): boolean {
  return (
    row.temperature != null &&
    row.humidity != null &&
    !Number.isNaN(row.temperature) &&
    !Number.isNaN(row.humidity)
  );
}

/**
 * 1時間が葉面濡れ状態かどうかを推定する。
 * 降水量または高湿度（露・霧の代理指標）で判定。
 */
export function isHourWet(row: HourlyWeatherRecord): boolean {
  if (!isValidHour(row)) {
    return false;
  }

  const precip = row.precipitation_mm ?? 0;
  if (precip >= PRECIP_WET_THRESHOLD_MM) {
    return true;
  }

  return row.humidity! >= RH_WET_THRESHOLD;
}

function averageTemperature(rows: HourlyWeatherRecord[]): number {
  const temps = rows
    .map((row) => row.temperature)
    .filter((value): value is number => value != null && !Number.isNaN(value));
  if (temps.length === 0) {
    return NaN;
  }
  return temps.reduce((sum, value) => sum + value, 0) / temps.length;
}

function finalizePeriod(rows: HourlyWeatherRecord[]): WetPeriod | null {
  if (rows.length === 0) {
    return null;
  }

  const avgTemp = averageTemperature(rows);
  if (Number.isNaN(avgTemp)) {
    return null;
  }

  return {
    startDateTime: rows[0].datetime,
    endDateTime: rows[rows.length - 1].datetime,
    durationHours: rows.length,
    averageTemperature: avgTemp,
    wetHours: rows,
  };
}

/**
 * 時間別気象データから連続葉面濡れ期間を抽出する。
 * 1時間以内の乾燥ギャップは同一濡れ期間として結合（RIMpro 系の慣行）。
 */
export function findWetPeriods(hourly: HourlyWeatherRecord[]): WetPeriod[] {
  const sorted = [...hourly]
    .filter((row) => row.datetime)
    .sort(
      (a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

  const periods: WetPeriod[] = [];
  let current: HourlyWeatherRecord[] = [];
  let dryGapHours = 0;
  let gapBuffer: HourlyWeatherRecord[] = [];

  for (const row of sorted) {
    if (isHourWet(row)) {
      if (dryGapHours > 0 && dryGapHours <= MAX_DRY_GAP_HOURS) {
        current.push(...gapBuffer);
        gapBuffer = [];
        dryGapHours = 0;
      }
      current.push(row);
      continue;
    }

    if (current.length > 0) {
      dryGapHours += 1;
      gapBuffer.push(row);
      if (dryGapHours > MAX_DRY_GAP_HOURS) {
        const period = finalizePeriod(current);
        if (period) {
          periods.push(period);
        }
        current = [];
        gapBuffer = [];
        dryGapHours = 0;
      }
    }
  }

  const trailing = finalizePeriod(current);
  if (trailing) {
    periods.push(trailing);
  }

  return periods;
}

/**
 * 評価時点で進行中の濡れ期間（末尾が濡れ状態）を返す。
 */
export function findOngoingWetPeriod(
  hourly: HourlyWeatherRecord[]
): WetPeriod | null {
  const sorted = [...hourly]
    .filter((row) => row.datetime)
    .sort(
      (a, b) =>
        new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

  if (sorted.length === 0 || !isHourWet(sorted[sorted.length - 1])) {
    return null;
  }

  let startIndex = sorted.length - 1;
  let dryGap = 0;

  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    if (isHourWet(sorted[i])) {
      startIndex = i;
      dryGap = 0;
      continue;
    }

    dryGap += 1;
    if (dryGap > MAX_DRY_GAP_HOURS) {
      break;
    }
    startIndex = i;
  }

  return finalizePeriod(sorted.slice(startIndex));
}
