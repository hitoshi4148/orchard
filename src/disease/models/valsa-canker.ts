import { HourlyWeatherRecord } from "../nasa-power";
import { DiseaseModelDefinition, DiseaseWeatherInput } from "../types";
import {
  filterHourlyInWindow,
  getJstMonth,
  recencyWeight,
} from "./risk-utils";

/**
 * リンゴ・ナシ腐らん病（Valsa ceratosperma）の気象リスクモデル
 *
 * 文献: 青森県工業技術センター、長野県農業試験場、日本農薬（胞子飛散・感染生态）
 * - 柄胞子は降雨に伴い飛散（11月〜翌6月が盛期）
 * - 剪定痕等の傷口から侵入（低温期は治癒が遅く感染しやすい）
 * - 発病ピークは3〜6月（特に4〜5月）
 */

/** 傷口治癒が遅く感染しやすい気温帯（℃） */
export const INFECTION_TEMP_MIN = 5;
export const INFECTION_TEMP_MAX = 22;

/** 高湿度の閾値（%）— 腐らん病は叶部露より傷口周辺の湿潤を代理 */
export const MOISTURE_RH_THRESHOLD = 85;

export const PRECIP_THRESHOLD_MM = 0.1;

/** 胞子飛散盛期（JST 月）: 11,12,1,2,3,4,5,6 */
const PEAK_MONTHS = new Set([11, 12, 1, 2, 3, 4, 5, 6]);
const MODERATE_MONTHS = new Set([10, 7]);

function seasonalFactor(month: number): number {
  if (PEAK_MONTHS.has(month)) {
    return 1.0;
  }
  if (MODERATE_MONTHS.has(month)) {
    return 0.55;
  }
  return 0.25;
}

function isValidHour(row: HourlyWeatherRecord): boolean {
  return (
    row.temperature != null &&
    row.humidity != null &&
    !Number.isNaN(row.temperature) &&
    !Number.isNaN(row.humidity)
  );
}

function hasPrecipitation(row: HourlyWeatherRecord): boolean {
  return (row.precipitation_mm ?? 0) >= PRECIP_THRESHOLD_MM;
}

function isMoist(row: HourlyWeatherRecord): boolean {
  if (!isValidHour(row)) {
    return false;
  }
  if (hasPrecipitation(row)) {
    return true;
  }
  return row.humidity! >= MOISTURE_RH_THRESHOLD;
}

function isInfectionFavorableHour(row: HourlyWeatherRecord): boolean {
  if (!isValidHour(row)) {
    return false;
  }
  const temp = row.temperature!;
  if (temp < INFECTION_TEMP_MIN || temp > INFECTION_TEMP_MAX) {
    return false;
  }
  return isMoist(row);
}

function hourContribution(row: HourlyWeatherRecord, targetMs: number): number {
  if (!isInfectionFavorableHour(row)) {
    return 0;
  }

  const hourMs = new Date(row.datetime).getTime();
  const weight = recencyWeight(hourMs, targetMs);
  let score = 2.8 * weight;

  if (hasPrecipitation(row)) {
    score += 1.4 * weight;
  }

  return score;
}

/**
 * 腐らん病リスク（0–100%）
 */
export function calculateValsaCankerRisk(
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

export const valsaCankerModel: DiseaseModelDefinition = {
  key: "brownPatch",
  displayName: "腐らん病",
  description:
    "Valsa ceratosperma の胞子飛散（降雨）と低温期の傷口感染リスク。11月〜6月の飛散盛期を季節係数で反映。",
  calculate: calculateValsaCankerRisk,
};
