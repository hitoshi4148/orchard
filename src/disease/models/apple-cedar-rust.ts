import { filterHourlyInWindow, getJstMonth, recencyWeight } from "./risk-utils";
import { findOngoingWetPeriod, findWetPeriods } from "../wetness";
import { DiseaseModelDefinition, DiseaseWeatherInput, WetPeriod } from "../types";

/**
 * リンゴ赤星病（Gymnosporangium yamadae）の気象リスクモデル
 *
 * 文献: 全国農村教育協会「赤星病」、北日本病害虫研究会（降雨と高湿継続）
 * - ビャクシン類上の冬胞子堆が4–5月の降雨で膨潤し小生子を飛散
 * - 降雨後 RH90%以上が15–30時間続くと感染が増加
 * - 開花期前後が防除重要期（本モデルは気象リスクのみ。中間宿主の有無は未考慮）
 */

export const INFECTION_TEMP_MIN = 10;
export const INFECTION_TEMP_MAX = 22;

export const MIN_WETNESS_HOURS = 6;
export const HIGH_WETNESS_HOURS = 15;

export const PRECIP_THRESHOLD_MM = 0.1;

/** 小生子飛散盛期（JST 月）: 4–5月 */
const PEAK_MONTHS = new Set([4, 5]);
const MODERATE_MONTHS = new Set([3, 6]);

function seasonalFactor(month: number): number {
  if (PEAK_MONTHS.has(month)) {
    return 1.0;
  }
  if (MODERATE_MONTHS.has(month)) {
    return 0.55;
  }
  return 0.12;
}

function wetPeriodHasRain(period: WetPeriod): boolean {
  return period.wetHours.some(
    (row) => (row.precipitation_mm ?? 0) >= PRECIP_THRESHOLD_MM
  );
}

function wetPeriodContribution(
  period: WetPeriod,
  targetMs: number
): number {
  const avgTemp = period.averageTemperature;
  if (avgTemp < INFECTION_TEMP_MIN || avgTemp > INFECTION_TEMP_MAX) {
    return 0;
  }
  if (period.durationHours < MIN_WETNESS_HOURS) {
    return 0;
  }
  if (!wetPeriodHasRain(period)) {
    return 0;
  }

  const endMs = new Date(period.endDateTime).getTime();
  const weight = recencyWeight(endMs, targetMs);
  let severity = Math.min(2.2, period.durationHours / MIN_WETNESS_HOURS);
  if (period.durationHours >= HIGH_WETNESS_HOURS) {
    severity = Math.min(2.5, severity * 1.15);
  }

  return 32 * weight * severity;
}

function ongoingPeriodContribution(
  hourly: ReturnType<typeof filterHourlyInWindow>,
  targetMs: number
): number {
  const ongoing = findOngoingWetPeriod(hourly);
  if (!ongoing || !wetPeriodHasRain(ongoing)) {
    return 0;
  }

  const avgTemp = ongoing.averageTemperature;
  if (avgTemp < INFECTION_TEMP_MIN || avgTemp > INFECTION_TEMP_MAX) {
    return 0;
  }

  const progress = ongoing.durationHours / MIN_WETNESS_HOURS;
  if (progress < 0.5) {
    return 0;
  }
  if (progress >= 1) {
    return 0;
  }

  return 18 * progress;
}

/**
 * 赤星病リスク（0–100%）
 */
export function calculateAppleCedarRustRisk(
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

  const periods = findWetPeriods(windowHourly);
  let risk = periods.reduce(
    (sum, period) => sum + wetPeriodContribution(period, targetMs),
    0
  );

  risk += ongoingPeriodContribution(windowHourly, targetMs);

  return Math.min(100, Math.max(0, Math.round(season * risk)));
}

export const appleCedarRustModel: DiseaseModelDefinition = {
  key: "largePatch",
  displayName: "赤星病",
  description:
    "Gymnosporangium yamadae の春季降雨飛散と濡れ継続時間から、展葉～落花期の感染リスクを推定。4–5月を季節係数で反映。",
  calculate: calculateAppleCedarRustRisk,
};
