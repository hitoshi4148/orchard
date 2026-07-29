import { HourlyWeatherRecord } from "../nasa-power";
import { DiseaseModelDefinition, DiseaseWeatherInput } from "../types";
import {
  filterHourlyInWindow,
  getJstMonth,
  recencyWeight,
} from "./risk-utils";

/**
 * リンゴ輪紋病（Botryosphaeria dothidea）の気象リスクモデル
 *
 * 文献: 宮城県「輪紋病」技術資料、北日本病害虫研究会（柄胞子飛散と気象）
 * - 柄胞子は降雨時のみ飛散（4月下旬〜10月、6–8月がピーク）
 * - 果実感染: 降雨日の最低気温16℃以上、RH90%以上が重要
 * - 降水量0.5mm以上・降雨1–2時間以上で飛散量が増加
 */

/** 飛散・感染に有利な気温帯（℃）— 最低気温16℃以上の条件を時間気温で代理 */
export const INFECTION_TEMP_MIN = 16;
export const INFECTION_TEMP_MAX = 32;

/** 果実感染に重要な高湿度（%） */
export const MOISTURE_RH_THRESHOLD = 90;

export const PRECIP_THRESHOLD_MM = 0.1;
export const DISPERSAL_PRECIP_THRESHOLD_MM = 0.5;

/** 胞子飛散盛期（JST 月）: 6–8月 */
const PEAK_MONTHS = new Set([6, 7, 8]);
const MODERATE_MONTHS = new Set([5, 9]);
const EARLY_LATE_MONTHS = new Set([4, 10]);

function seasonalFactor(month: number): number {
  if (PEAK_MONTHS.has(month)) {
    return 1.0;
  }
  if (MODERATE_MONTHS.has(month)) {
    return 0.75;
  }
  if (EARLY_LATE_MONTHS.has(month)) {
    return 0.45;
  }
  return 0.2;
}

function isValidHour(row: HourlyWeatherRecord): boolean {
  return (
    row.temperature != null &&
    row.humidity != null &&
    !Number.isNaN(row.temperature) &&
    !Number.isNaN(row.humidity)
  );
}

function precipMm(row: HourlyWeatherRecord): number {
  return row.precipitation_mm ?? 0;
}

function isWarmEnough(row: HourlyWeatherRecord): boolean {
  const temp = row.temperature!;
  return temp >= INFECTION_TEMP_MIN && temp <= INFECTION_TEMP_MAX;
}

function hourContribution(row: HourlyWeatherRecord, targetMs: number): number {
  if (!isValidHour(row) || !isWarmEnough(row)) {
    return 0;
  }

  const hourMs = new Date(row.datetime).getTime();
  const weight = recencyWeight(hourMs, targetMs);
  const precip = precipMm(row);
  const humidity = row.humidity!;

  if (precip >= PRECIP_THRESHOLD_MM) {
    let score = 2.5 * weight;
    if (precip >= DISPERSAL_PRECIP_THRESHOLD_MM) {
      score += 1.5 * weight;
    }
    if (humidity >= MOISTURE_RH_THRESHOLD) {
      score += 0.9 * weight;
    }
    return score;
  }

  if (humidity >= MOISTURE_RH_THRESHOLD) {
    return 1.0 * weight;
  }

  return 0;
}

/**
 * 輪紋病リスク（0–100%）
 */
export function calculateAppleRingRotRisk(
  input: DiseaseWeatherInput
): number | null {
  const { hourly, targetDateTime } = input;
  if (!hourly || hourly.length === 0) {
    return null;
  }

  const targetMs = new Date(targetDateTime).getTime();
  const windowHourly = filterHourlyInWindow(hourly, targetMs);
  if (windowHourly.length < 12) {
    return null;
  }

  const month = getJstMonth(targetDateTime);
  const season = seasonalFactor(month);

  const rawScore = windowHourly.reduce(
    (sum, row) => sum + hourContribution(row, targetMs),
    0
  );

  const risk = season * rawScore;
  return Math.min(100, Math.max(0, Math.round(risk)));
}

export const appleRingRotModel: DiseaseModelDefinition = {
  key: "anthracnose",
  displayName: "輪紋病",
  description:
    "Botryosphaeria dothidea の降雨飛散と高温多湿から、果実・枝幹への輪紋病感染リスクを推定。6–8月の飛散盛期を季節係数で反映。",
  calculate: calculateAppleRingRotRisk,
};
