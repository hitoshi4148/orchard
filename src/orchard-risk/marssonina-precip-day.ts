
import { HourlyWeatherRecord } from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import {
  MARSSONINA_WET_AVG_TEMP_MIN_C,
  MARSSONINA_WET_DURATION_MIN_H,
} from "./marssonina-constants";
import {
  buildMarssoninaSuzukiWetHours,
  groupSuzukiWetByPrecipDay,
  isMarssoninaPrecipWetHour,
} from "./marssonina-wetness-suzuki";
import { MarssoninaAttributedWetHour } from "./marssonina-wet-types";

export type { MarssoninaAttributedWetHour } from "./marssonina-wet-types";

export interface MarssoninaPrecipDayStats {
  precipDay: string;
  isPrecipitationDay: boolean;
  wetDurationHours: number;
  wetAvgTempC: number | null;
  precipWetHourCount: number;
  missingHourCount: number;
  incomplete: boolean;
  qualifies: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  attributedWetHours: MarssoninaAttributedWetHour[];
  /** Phase 2: 延長のみの時間数（降水≥0.5 以外） */
  extensionWetHourCount?: number;
}

function isValidTemp(temp: number | null | undefined): boolean {
  return temp != null && !Number.isNaN(temp) && temp > -900;
}

function indexHourlyByKey(
  hourly: HourlyWeatherRecord[]
): Map<string, HourlyWeatherRecord> {
  const map = new Map<string, HourlyWeatherRecord>();
  for (const row of hourly) {
    if (!row.datetime) continue;
    map.set(row.datetime.slice(0, 13), row);
  }
  return map;
}

/** JST 暦日 1 日分 — Phase 1（延長なし） */
export function evaluateMarssoninaPrecipDayPhase1(
  precipDay: string,
  hourlyByKey: Map<string, HourlyWeatherRecord>
): MarssoninaPrecipDayStats {
  const attributedWetHours: MarssoninaAttributedWetHour[] = [];
  let missingHourCount = 0;
  let precipWetHourCount = 0;

  for (let h = 0; h < 24; h += 1) {
    const key = `${precipDay}T${String(h).padStart(2, "0")}`;
    const row = hourlyByKey.get(key);
    if (!row) {
      missingHourCount += 1;
      continue;
    }

    const wet = isMarssoninaPrecipWetHour(row);
    if (wet) {
      precipWetHourCount += 1;
      attributedWetHours.push({
        datetime: row.datetime,
        attributionPrecipDay: precipDay,
        precipitation_mm: row.precipitation_mm,
        temperature: row.temperature,
        isPrecipWet: true,
      });
    }
  }

  return finalizePrecipDayStats(
    precipDay,
    attributedWetHours,
    precipWetHourCount,
    missingHourCount,
    hourlyByKey
  );
}

function finalizePrecipDayStats(
  precipDay: string,
  attributedWetHours: MarssoninaAttributedWetHour[],
  precipWetHourCount: number,
  missingHourCount: number,
  hourlyByKey: Map<string, HourlyWeatherRecord>
): MarssoninaPrecipDayStats {
  const isPrecipitationDay = precipWetHourCount > 0;
  const wetDurationHours = attributedWetHours.length;
  const extensionWetHourCount = attributedWetHours.filter(
    (w) => !w.isPrecipWet
  ).length;

  let wetAvgTempC: number | null = null;
  let tempMissingOnWet = false;
  const temps: number[] = [];
  let attributedMissingRow = 0;
  for (const wh of attributedWetHours) {
    const key = wh.datetime.slice(0, 13);
    if (!hourlyByKey.get(key)) attributedMissingRow += 1;
    if (!isValidTemp(wh.temperature)) {
      tempMissingOnWet = true;
      continue;
    }
    temps.push(wh.temperature!);
  }

  if (temps.length > 0) {
    wetAvgTempC =
      Math.round((temps.reduce((s, t) => s + t, 0) / temps.length) * 10) / 10;
  }

  const incomplete =
    missingHourCount > 0 ||
    attributedMissingRow > 0 ||
    (wetDurationHours > 0 && (tempMissingOnWet || temps.length === 0));

  const qualifies =
    isPrecipitationDay &&
    !incomplete &&
    wetDurationHours >= MARSSONINA_WET_DURATION_MIN_H &&
    wetAvgTempC != null &&
    wetAvgTempC >= MARSSONINA_WET_AVG_TEMP_MIN_C;

  const periodStart =
    attributedWetHours.length > 0 ? attributedWetHours[0].datetime : null;
  const periodEnd =
    attributedWetHours.length > 0
      ? attributedWetHours[attributedWetHours.length - 1].datetime
      : null;

  return {
    precipDay,
    isPrecipitationDay,
    wetDurationHours,
    wetAvgTempC,
    precipWetHourCount,
    missingHourCount,
    incomplete,
    qualifies,
    periodStart,
    periodEnd,
    attributedWetHours,
    extensionWetHourCount,
  };
}

/** JST 暦日 1 日分 — Phase 2（鈴木延長・帰属済みリストを渡す） */
export function evaluateMarssoninaPrecipDayPhase2(
  precipDay: string,
  hourlyByKey: Map<string, HourlyWeatherRecord>,
  attributedForDay: MarssoninaAttributedWetHour[]
): MarssoninaPrecipDayStats {
  let missingHourCount = 0;
  let precipWetHourCount = 0;
  for (let h = 0; h < 24; h += 1) {
    const key = `${precipDay}T${String(h).padStart(2, "0")}`;
    const row = hourlyByKey.get(key);
    if (!row) {
      missingHourCount += 1;
      continue;
    }
    if (isMarssoninaPrecipWetHour(row)) precipWetHourCount += 1;
  }

  const sorted = [...attributedForDay].sort((a, b) =>
    a.datetime.localeCompare(b.datetime)
  );

  return finalizePrecipDayStats(
    precipDay,
    sorted,
    precipWetHourCount,
    missingHourCount,
    hourlyByKey
  );
}

/** デフォルト評価 = Phase 2 */
export function evaluateMarssoninaPrecipDay(
  precipDay: string,
  hourlyByKey: Map<string, HourlyWeatherRecord>,
  suzukiByDay?: Map<string, MarssoninaAttributedWetHour[]>
): MarssoninaPrecipDayStats {
  const attributed =
    suzukiByDay?.get(precipDay) ??
    buildMarssoninaSuzukiWetHours(hourlyByKey).filter(
      (w) => w.attributionPrecipDay === precipDay
    );
  return evaluateMarssoninaPrecipDayPhase2(
    precipDay,
    hourlyByKey,
    attributed
  );
}

export type MarssoninaPrecipDayMode = "phase1" | "phase2";

function buildSuzukiByDay(
  hourlyByKey: Map<string, HourlyWeatherRecord>
): Map<string, MarssoninaAttributedWetHour[]> {
  return groupSuzukiWetByPrecipDay(buildMarssoninaSuzukiWetHours(hourlyByKey));
}

export function listMarssoninaPrecipDayStats(
  hourly: HourlyWeatherRecord[],
  bloomStart: string,
  explorationEnd: string,
  mode: MarssoninaPrecipDayMode = "phase2"
): MarssoninaPrecipDayStats[] {
  const hourlyByKey = indexHourlyByKey(hourly);
  const suzukiByDay =
    mode === "phase2" ? buildSuzukiByDay(hourlyByKey) : undefined;
  const out: MarssoninaPrecipDayStats[] = [];
  let d = bloomStart;
  while (d <= explorationEnd) {
    out.push(
      mode === "phase1"
        ? evaluateMarssoninaPrecipDayPhase1(d, hourlyByKey)
        : evaluateMarssoninaPrecipDayPhase2(
            d,
            hourlyByKey,
            suzukiByDay?.get(d) ?? []
          )
    );
    d = addDaysToDateString(d, 1);
  }
  return out;
}

export function listQualifyingMarssoninaPrecipDays(
  hourly: HourlyWeatherRecord[],
  bloomStart: string,
  explorationEnd: string,
  mode: MarssoninaPrecipDayMode = "phase2"
): MarssoninaPrecipDayStats[] {
  return listMarssoninaPrecipDayStats(
    hourly,
    bloomStart,
    explorationEnd,
    mode
  ).filter((day) => day.qualifies);
}
