import { HourlyWeatherRecord } from "../nasa-power";
import { DiseaseModelDefinition, DiseaseWeatherInput } from "../types";
import {
  filterHourlyInWindow,
  getJstMonth,
  recencyWeight,
} from "./risk-utils";

/**
 * かいよう病（リンゴ・ナシ疫病 / Phytophthora 属）の気象リスクモデル
 *
 * 文献: 弘前大学リンゴ病害DB、全国農村教育協会「疫病」、日植病報（P. syringae）
 * - 遊走子は降雨・多湿条件下で遊走し、泥はね・飛沫で果実・台木等に伝染
 * - 卵胞子・遊走子の発芽適温はおおむね 15–20℃（0–25℃、30℃付近では抑制）
 * - 幼果は梅雨期（6–7月）の集中降雨で、成熟果は収穫期の多湿でもリスク上昇
 */

/** 感染リスクを評価する気温帯（℃） */
export const INFECTION_TEMP_MIN = 10;
export const INFECTION_TEMP_MAX = 28;

export const MOISTURE_RH_THRESHOLD = 88;
export const PRECIP_THRESHOLD_MM = 0.1;
export const HEAVY_PRECIP_THRESHOLD_MM = 1.0;

/** 果実・新梢への飛沫感染リスクが高い期（JST 月） */
const PEAK_MONTHS = new Set([5, 6, 7, 8, 9]);
const MODERATE_MONTHS = new Set([4, 10]);
const LOW_MONTHS = new Set([3, 11]);

function seasonalFactor(month: number): number {
  if (PEAK_MONTHS.has(month)) {
    return 1.0;
  }
  if (MODERATE_MONTHS.has(month)) {
    return 0.7;
  }
  if (LOW_MONTHS.has(month)) {
    return 0.4;
  }
  return 0.15;
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

function isMoist(row: HourlyWeatherRecord): boolean {
  if (!isValidHour(row)) {
    return false;
  }
  if (precipMm(row) >= PRECIP_THRESHOLD_MM) {
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
  let score = 2.4 * weight;

  const precip = precipMm(row);
  if (precip >= PRECIP_THRESHOLD_MM) {
    score += 1.2 * weight;
  }
  if (precip >= HEAVY_PRECIP_THRESHOLD_MM) {
    score += 1.8 * weight;
  }

  return score;
}

/**
 * かいよう病（Phytophthora 疫病）リスク（0–100%）
 */
export function calculatePhytophthoraRisk(
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

export const phytophthoraModel: DiseaseModelDefinition = {
  key: "pythium",
  displayName: "かいよう病",
  description:
    "Phytophthora 属（リンゴ・ナシ疫病）の降雨飛沫・多湿リスク。遊走子散布と幼果期の泥はね感染を気象で推定。",
  calculate: calculatePhytophthoraRisk,
};
