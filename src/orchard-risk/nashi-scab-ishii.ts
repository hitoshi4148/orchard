/**
 * 日本なし黒星（Venturia nashicola）— Ishii & Yanase (2003) 最小濡れ時間 L(T)
 * Plant Pathology 52: 322–327. Table 3 実測（分離葉・自由水）を線形補間。
 * L(T) 表は `nashi-scab-duthie.ts` と共有。単独スコアはテスト用に残す。
 */
import { findWetPeriods } from "../disease/wetness";
import { filterHourlyInWindow } from "../disease/models/risk-utils";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import { DiseaseWeatherInput } from "../disease/types";

/** 温度（℃）→ 感染に必要な最小濡れ時間（時間） */
const MIN_WETNESS_BY_TEMP: [number, number][] = [
  [10, 16],
  [14, 10],
  [18, 8],
  [22, 7],
  [26, 8],
];

const TEMP_MIN = 10;
const TEMP_MAX = 26;

export function nashiScabMinWetnessHours(tempC: number): number | null {
  if (tempC < TEMP_MIN || tempC > TEMP_MAX) {
    return null;
  }
  for (let i = 0; i < MIN_WETNESS_BY_TEMP.length - 1; i += 1) {
    const [t0, l0] = MIN_WETNESS_BY_TEMP[i];
    const [t1, l1] = MIN_WETNESS_BY_TEMP[i + 1];
    if (tempC >= t0 && tempC <= t1) {
      const ratio = (tempC - t0) / (t1 - t0);
      return l0 + ratio * (l1 - l0);
    }
  }
  return MIN_WETNESS_BY_TEMP[MIN_WETNESS_BY_TEMP.length - 1][1];
}

export interface NashiScabInfectionEvent {
  periodStart: string;
  periodEnd: string;
  durationHours: number;
  averageTemperature: number;
  requiredWetnessHours: number;
  infectionDateKey: string;
}

function infectionDateKeyFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function detectNashiScabInfectionEvents(
  hourly: HourlyWeatherRecord[],
  targetMs: number
): NashiScabInfectionEvent[] {
  const windowHourly = filterHourlyInWindow(hourly, targetMs);
  const periods = findWetPeriods(windowHourly);
  const events: NashiScabInfectionEvent[] = [];

  for (const period of periods) {
    const required = nashiScabMinWetnessHours(period.averageTemperature);
    if (required == null) {
      continue;
    }
    if (period.durationHours + 1e-6 < required) {
      continue;
    }
    events.push({
      periodStart: period.startDateTime,
      periodEnd: period.endDateTime,
      durationHours: period.durationHours,
      averageTemperature: period.averageTemperature,
      requiredWetnessHours: required,
      infectionDateKey: infectionDateKeyFromIso(period.endDateTime),
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
  );
}

function eventScore(
  event: NashiScabInfectionEvent,
  targetMs: number
): number {
  const endMs = new Date(event.periodEnd).getTime();
  const ageHours = (targetMs - endMs) / (60 * 60 * 1000);
  const recency =
    ageHours <= 24 ? 1 : ageHours <= 48 ? 0.75 : ageHours <= 120 ? 0.45 : 0.2;
  const severity = Math.min(
    2.5,
    Math.max(1, event.durationHours / event.requiredWetnessHours)
  );
  return 38 * recency * severity;
}

/**
 * 0–100% 感染危険（分生胞子・葉面濡れ前提。自由水は降水/RH 推定）。
 */
export function calculateNashiScabIshiiRisk(
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

  const events = detectNashiScabInfectionEvents(hourly, targetMs);
  let risk = events.reduce((sum, ev) => sum + eventScore(ev, targetMs), 0);

  const periods = findWetPeriods(filterHourlyInWindow(hourly, targetMs, 48));
  const ongoing = periods.find((p) => {
    const endMs = new Date(p.endDateTime).getTime();
    return endMs >= targetMs - 2 * 60 * 60 * 1000;
  });
  if (ongoing) {
    const required = nashiScabMinWetnessHours(ongoing.averageTemperature);
    if (required != null && ongoing.durationHours < required) {
      const progress = ongoing.durationHours / required;
      if (progress >= 0.5) {
        risk += 18 * progress;
      }
    }
  }

  return Math.min(100, Math.max(0, Math.round(risk)));
}

export function findLatestNashiScabInfectionEvent(
  hourly: HourlyWeatherRecord[],
  targetDateTime: string
): NashiScabInfectionEvent | null {
  const events = detectNashiScabInfectionEvents(
    hourly,
    new Date(targetDateTime).getTime()
  );
  return events[0] ?? null;
}
