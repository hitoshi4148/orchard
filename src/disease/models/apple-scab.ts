import {
  filterHourlyInWindow,
  recencyWeight,
} from "./risk-utils";
import { findOngoingWetPeriod, findWetPeriods } from "../wetness";
import { HourlyWeatherRecord } from "../nasa-power";
import {
  DiseaseModelDefinition,
  DiseaseWeatherInput,
  MillsInfectionEvent,
} from "../types";
import {
  millsRequiredWetnessHours,
  MILLS_TEMP_MAX,
  MILLS_TEMP_MIN,
} from "../mills-table";

function detectMillsInfectionEvents(
  hourly: HourlyWeatherRecord[],
  targetMs: number
): MillsInfectionEvent[] {
  const windowHourly = filterHourlyInWindow(hourly, targetMs);
  const wetPeriods = findWetPeriods(windowHourly);
  const events: MillsInfectionEvent[] = [];

  for (const period of wetPeriods) {
    const requiredHours = millsRequiredWetnessHours(period.averageTemperature);
    if (requiredHours == null) {
      continue;
    }

    if (period.durationHours >= requiredHours) {
      events.push({
        wetPeriod: period,
        requiredHours,
        severityRatio: period.durationHours / requiredHours,
        endMs: new Date(period.endDateTime).getTime(),
      });
    }
  }

  return events.sort((a, b) => b.endMs - a.endMs);
}

function eventContribution(
  event: MillsInfectionEvent,
  targetMs: number
): number {
  const weight = recencyWeight(event.endMs, targetMs);
  const severity = Math.min(2.5, Math.max(1, event.severityRatio));
  return 35 * weight * severity;
}

function ongoingPeriodContribution(
  hourly: HourlyWeatherRecord[],
  targetMs: number
): number {
  const windowHourly = filterHourlyInWindow(hourly, targetMs);
  const ongoing = findOngoingWetPeriod(windowHourly);
  if (!ongoing) {
    return 0;
  }

  const requiredHours = millsRequiredWetnessHours(ongoing.averageTemperature);
  if (requiredHours == null) {
    return 0;
  }

  const progress = ongoing.durationHours / requiredHours;
  if (progress < 0.5) {
    return 0;
  }
  if (progress >= 1) {
    return 0;
  }

  return 20 * progress;
}

/**
 * 黒星病（Venturia inaequalis）リスク — Mills 法 + 葉面濡れ推定
 *
 * 1. 時間別データから葉面濡れ期間を推定（降水 + RH≥90%）
 * 2. 各濡れ期間の平均気温で Mills 必要濡れ時間を照合
 * 3. 感染イベントの重症度・新しさを 0–100% に集約
 */
export function calculateAppleScabRisk(
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

  const events = detectMillsInfectionEvents(hourly, targetMs);
  let risk = events.reduce(
    (sum, event) => sum + eventContribution(event, targetMs),
    0
  );

  risk += ongoingPeriodContribution(hourly, targetMs);

  return Math.min(100, Math.max(0, Math.round(risk)));
}

export const appleScabModel: DiseaseModelDefinition = {
  key: "dollarSpot",
  displayName: "黒星病",
  description:
    "Mills 法（改訂版）による Venturia inaequalis 一次感染リスク。葉面濡れは降水量と相対湿度90%以上から推定。",
  calculate: calculateAppleScabRisk,
};

export { MILLS_TEMP_MIN, MILLS_TEMP_MAX };
