/**
 * 日本なし黒星 — Duthie et al. (2007) 動的感染（Ishii & Yanase 2003 発芽式＋感染 L(T)）
 *
 * 各濡れ期間について発芽率ロジスティック（Eq.2–3）と最小濡れ L(T)（Table 3）を
 * 時間発展として評価し、両条件を満たす期間を感染イベントとする。
 */
import { findWetPeriods } from "../disease/wetness";
import { filterHourlyInWindow } from "../disease/models/risk-utils";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import { DiseaseWeatherInput } from "../disease/types";
import {
  NashiScabInfectionEvent,
  nashiScabMinWetnessHours,
} from "./nashi-scab-ishii";

/** Ishii (2003) Eq.2 — 発芽ロジスティック β（T は °C÷10） */
export function nashiScabGerminationLogisticBeta(tempC: number): number {
  const T = tempC / 10;
  return -0.1 + 1.27 * T * T - 0.41 * T * T * T;
}

/** Ishii (2003) Eq.3 — 発芽 50% 到達時間 M（時間） */
export function nashiScabGerminationLogisticM(tempC: number): number {
  const T = tempC / 10;
  return 17.5 - 10.55 * T + 0.82 * T * T * T;
}

/** 濡れ開始から t 時間後の推定発芽率（%） */
export function nashiScabGerminationPercentAt(
  wetHoursElapsed: number,
  tempC: number
): number {
  if (wetHoursElapsed <= 0) {
    return 0;
  }
  const beta = nashiScabGerminationLogisticBeta(tempC);
  const M = nashiScabGerminationLogisticM(tempC);
  const raw = 100 / (1 + Math.exp(-beta * (wetHoursElapsed - M)));
  return Math.min(100, Math.max(0, raw));
}

export interface NashiScabDuthieEvent extends NashiScabInfectionEvent {
  germinationPercent: number;
  /** 発芽≥50% かつ 濡れ≥L(T) */
  infectionCriteriaMet: boolean;
}

function infectionDateKeyFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function detectNashiScabDuthieEvents(
  hourly: HourlyWeatherRecord[],
  targetMs: number
): NashiScabDuthieEvent[] {
  const windowHourly = filterHourlyInWindow(hourly, targetMs);
  const periods = findWetPeriods(windowHourly);
  const events: NashiScabDuthieEvent[] = [];

  for (const period of periods) {
    const required = nashiScabMinWetnessHours(period.averageTemperature);
    if (required == null) {
      continue;
    }
    const germinationPercent = nashiScabGerminationPercentAt(
      period.durationHours,
      period.averageTemperature
    );
    const meetsWetness = period.durationHours + 1e-6 >= required;
    const meetsGermination = germinationPercent >= 50;
    if (!meetsWetness && germinationPercent < 25) {
      continue;
    }
    events.push({
      periodStart: period.startDateTime,
      periodEnd: period.endDateTime,
      durationHours: period.durationHours,
      averageTemperature: period.averageTemperature,
      requiredWetnessHours: required,
      infectionDateKey: infectionDateKeyFromIso(period.endDateTime),
      germinationPercent,
      infectionCriteriaMet: meetsWetness && meetsGermination,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
  );
}

function duthieEventScore(
  event: NashiScabDuthieEvent,
  targetMs: number
): number {
  const endMs = new Date(event.periodEnd).getTime();
  const ageHours = (targetMs - endMs) / (60 * 60 * 1000);
  const recency =
    ageHours <= 24 ? 1 : ageHours <= 48 ? 0.75 : ageHours <= 120 ? 0.45 : 0.2;

  let severity: number;
  if (event.infectionCriteriaMet) {
    const wetExcess = event.durationHours / event.requiredWetnessHours;
    const germFactor = Math.min(1.4, event.germinationPercent / 50);
    severity = Math.min(2.6, Math.max(1.1, wetExcess * germFactor));
  } else {
    const wetProgress = Math.min(
      1,
      event.durationHours / event.requiredWetnessHours
    );
    const germProgress = event.germinationPercent / 50;
    severity = 0.45 * Math.min(1, (wetProgress + germProgress) / 2);
  }

  return 42 * recency * severity;
}

/**
 * 0–100% 動的感染危険（分生胞子・濡れ期間内の発芽進展を考慮）
 */
export function calculateNashiScabDuthieRisk(
  input: DiseaseWeatherInput
): number | null {
  const { hourly, targetDateTime } = input;
  if (!hourly?.length) {
    return null;
  }
  const targetMs = new Date(targetDateTime).getTime();
  const windowHourly = filterHourlyInWindow(hourly, targetMs);
  if (windowHourly.length < 8) {
    return null;
  }

  const events = detectNashiScabDuthieEvents(hourly, targetMs);
  let risk = events.reduce((sum, ev) => sum + duthieEventScore(ev, targetMs), 0);

  const periods = findWetPeriods(filterHourlyInWindow(hourly, targetMs, 48));
  const ongoing = periods.find((p) => {
    const endMs = new Date(p.endDateTime).getTime();
    return endMs >= targetMs - 2 * 60 * 60 * 1000;
  });
  if (ongoing) {
    const required = nashiScabMinWetnessHours(ongoing.averageTemperature);
    const germ = nashiScabGerminationPercentAt(
      ongoing.durationHours,
      ongoing.averageTemperature
    );
    if (required != null) {
      const wetP = ongoing.durationHours / required;
      const germP = germ / 50;
      if (wetP >= 0.45 || germP >= 0.45) {
        risk += 20 * Math.min(1, (wetP + germP) / 2);
      }
    }
  }

  return Math.min(100, Math.max(0, Math.round(risk)));
}

export function findLatestNashiScabDuthieEvent(
  hourly: HourlyWeatherRecord[],
  targetDateTime: string
): NashiScabDuthieEvent | null {
  const events = detectNashiScabDuthieEvents(
    hourly,
    new Date(targetDateTime).getTime()
  );
  return (
    events.find((e) => e.infectionCriteriaMet) ??
    events[0] ??
    null
  );
}
