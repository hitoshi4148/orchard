/**
 * りんご黒星 — 升孢子成熟（MacHardy / Gadoury 系の簡易 GDD）
 *
 * - 基準温度 0℃、バイオフィックス＝季節窓開始日（緑期日未入力時の代用、群馬は gunma 窓）
 * - 成熟率は logistic（1/50/99% 付近を 130/280/600 日℃で近似、PDIS 2004 の 600 日℃参照）
 * - Mills スコアに ×(成熟率/100) を適用（供給側の一次感染）
 */

import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { getAppleScabSeasonWindow } from "./apple-scab-season";

export const APPLE_SCAB_ASCOSPORE_GDD_BASE_C = 0;
/** 文献上 98% 成熟付近の目安（緑期日起算・基準 0℃） */
export const APPLE_SCAB_ASCOSPORE_DEPLETION_GDD = 600;

export type AppleScabBiofixSource = "green_tip" | "season_window_proxy";

export interface AppleScabAscosporeMaturity {
  biofixDate: string;
  biofixSource: AppleScabBiofixSource;
  targetDate: string;
  gddDayC: number;
  maturityPercent: number;
  summary: string;
}

function jstYmdFromIso(isoDateTime: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoDateTime));
}

function jstYearFromIso(isoDateTime: string): number {
  const ymd = jstYmdFromIso(isoDateTime);
  return Number(ymd.slice(0, 4));
}

export function resolveAppleScabBiofix(
  lat: number,
  lon: number | undefined,
  targetDateTime: string,
  greenTipDate?: string | null
): { date: string; source: AppleScabBiofixSource } {
  const trimmed = greenTipDate?.trim();
  if (trimmed && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { date: trimmed, source: "green_tip" };
  }
  const window = getAppleScabSeasonWindow(lat, lon);
  const year = jstYearFromIso(targetDateTime);
  return {
    date: `${year}-${window.start}`,
    source: "season_window_proxy",
  };
}

/** @deprecated resolveAppleScabBiofix を使用 */
export function resolveAppleScabBiofixDate(
  lat: number,
  lon: number | undefined,
  targetDateTime: string,
  greenTipDate?: string | null
): string {
  return resolveAppleScabBiofix(lat, lon, targetDateTime, greenTipDate).date;
}

function dailyAvgFromHourly(
  hourly: HourlyWeatherRecord[],
  date: string
): number | null {
  const temps = hourly
    .filter((h) => h.datetime.startsWith(`${date}T`))
    .map((h) => h.temperature)
    .filter((t): t is number => t != null && !Number.isNaN(t));
  if (temps.length === 0) return null;
  return temps.reduce((s, t) => s + t, 0) / temps.length;
}

function gddForDay(avgTemp: number): number {
  return avgTemp > APPLE_SCAB_ASCOSPORE_GDD_BASE_C
    ? avgTemp - APPLE_SCAB_ASCOSPORE_GDD_BASE_C
    : 0;
}

function addDaysYmd(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** MacHardy 型 logistic（成熟率 0–100） */
export function ascosporeMaturityPercentFromGdd(gddDayC: number): number {
  if (gddDayC <= 0) return 0;
  const k = 0.025;
  const x0 = 280;
  const raw = 100 / (1 + Math.exp(-k * (gddDayC - x0)));
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
}

export function computeAppleScabAscosporeMaturity(
  biofixDate: string,
  targetDateTime: string,
  measuredDaily: DailyWeatherRecord[],
  hourlyForTarget: HourlyWeatherRecord[],
  biofixSource: AppleScabBiofixSource = "season_window_proxy"
): AppleScabAscosporeMaturity {
  const targetDate = jstYmdFromIso(targetDateTime);
  const dailyMap = new Map(measuredDaily.map((r) => [r.date, r]));

  let gdd = 0;
  let d = biofixDate;
  while (d <= targetDate) {
    let avg: number | null = null;
    const row = dailyMap.get(d);
    if (row?.temperature_avg != null && row.temperature_avg > -100) {
      avg = row.temperature_avg;
    } else if (d === targetDate) {
      avg = dailyAvgFromHourly(hourlyForTarget, d);
    }
    if (avg != null) {
      gdd += gddForDay(avg);
    }
    if (d === targetDate) break;
    d = addDaysYmd(d, 1);
  }

  const roundedGdd = Math.round(gdd * 10) / 10;
  const maturityPercent = ascosporeMaturityPercentFromGdd(roundedGdd);

  const biofixLabel =
    biofixSource === "green_tip"
      ? `緑期日 ${biofixDate}`
      : `季節窓代理 ${biofixDate}`;

  let summary: string;
  if (roundedGdd < 30) {
    summary = `升孢子は未熟（${biofixLabel} 起算・基準0℃積算 ${roundedGdd} 日℃・成熟率 ${maturityPercent}%）。`;
  } else if (roundedGdd >= APPLE_SCAB_ASCOSPORE_DEPLETION_GDD * 0.95) {
    summary = `升孢子は概ね放出末期（${biofixLabel} 起算・積算 ${roundedGdd} 日℃・成熟率 ${maturityPercent}%・600日℃目安）。`;
  } else {
    summary = `升孢子成熟率 ${maturityPercent}%（${biofixLabel} 起算・基準0℃積算 ${roundedGdd} 日℃）。`;
  }

  return {
    biofixDate,
    biofixSource,
    targetDate,
    gddDayC: roundedGdd,
    maturityPercent,
    summary,
  };
}
