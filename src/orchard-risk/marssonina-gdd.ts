import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { calculateGddFromDaily } from "../gdd/fetch-gdd";
import {
  addDaysToDateString,
  jstTodayString,
} from "../disease/met-norway-forecast";
import {
  MARSSONINA_GDD_BASE_C,
  MARSSONINA_GDD_THRESHOLD_DAYC,
} from "./marssonina-constants";

/** 猫塚（2023）の起算日定義は未確認。P3 仮定: 候補日の翌日から積算（候補日当日は含めない） */
export const MARSSONINA_GDD_START_ASSUMPTION = "day_after_infection_candidate" as const;

export type MarssoninaGddDataQuality = "full" | "degraded" | "insufficient";
export type MarssoninaGddOnsetSource = "measured" | "forecast" | null;

export interface MarssoninaGddEstimate {
  gddStartDate: string;
  gddStartAssumption: typeof MARSSONINA_GDD_START_ASSUMPTION;
  baseTempC: number;
  thresholdDayC: number;
  measuredGddDayC: number;
  forecastGddDayC: number;
  totalGddThroughForecastDayC: number;
  missingDailyCount: number;
  measuredPeriodStart: string;
  measuredPeriodEnd: string;
  forecastPeriodStart: string | null;
  forecastPeriodEnd: string | null;
  thresholdReached: boolean;
  thresholdReachedInMeasured: boolean;
  thresholdReachedInForecast: boolean;
  estimatedOnsetDate: string | null;
  onsetSource: MarssoninaGddOnsetSource;
  dataQuality: MarssoninaGddDataQuality;
  modelConfidence: "低" | "中";
  thresholdStatusLabel: string;
  predictedOnsetWindow: string;
}

function daysBetweenInclusive(start: string, end: string): number {
  const [ys, ms, ds] = start.split("-").map(Number);
  const [ye, me, de] = end.split("-").map(Number);
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(ye, me - 1, de);
  return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

function listDatesInclusive(start: string, end: string): string[] {
  const out: string[] = [];
  let d = start;
  while (d <= end) {
    out.push(d);
    d = addDaysToDateString(d, 1);
  }
  return out;
}

function dailyAvgFromHourly(
  hourly: HourlyWeatherRecord[],
  date: string
): number | null {
  const rows = hourly.filter((r) => r.datetime.startsWith(`${date}T`));
  const temps = rows
    .map((r) => r.temperature)
    .filter((t): t is number => t != null && !Number.isNaN(t));
  if (temps.length === 0) return null;
  return temps.reduce((s, t) => s + t, 0) / temps.length;
}

function gddForDay(avgTemp: number, base: number): number {
  return avgTemp > base ? avgTemp - base : 0;
}

function roundDayC(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 感染候補日（濡れ終了日）から GDD・発病時期を推定 */
export function computeMarssoninaGddEstimate(
  infectionCandidateDate: string,
  nasaDaily: DailyWeatherRecord[],
  forecastHourly: HourlyWeatherRecord[],
  yesterday: string,
  today: string = jstTodayString()
): MarssoninaGddEstimate {
  const base = MARSSONINA_GDD_BASE_C;
  const threshold = MARSSONINA_GDD_THRESHOLD_DAYC;
  const gddStartDate = addDaysToDateString(infectionCandidateDate, 1);

  const measuredEnd = yesterday;
  const measuredDates =
    gddStartDate <= measuredEnd
      ? listDatesInclusive(gddStartDate, measuredEnd)
      : [];

  const dailyByDate = new Map<string, DailyWeatherRecord>();
  for (const row of nasaDaily) {
    dailyByDate.set(row.date, row);
  }

  let measuredGdd = 0;
  let measuredMissingCount = 0;
  let forecastMissingCount = 0;
  let thresholdReachedInMeasured = false;
  let measuredOnsetDate: string | null = null;

  for (const date of measuredDates) {
    const row = dailyByDate.get(date);
    const temp = row?.temperature_avg;
    if (
      temp == null ||
      Number.isNaN(temp) ||
      temp <= -900
    ) {
      measuredMissingCount += 1;
      continue;
    }
    measuredGdd += gddForDay(temp, base);
    if (!thresholdReachedInMeasured && measuredGdd >= threshold) {
      thresholdReachedInMeasured = true;
      measuredOnsetDate = date;
    }
  }
  measuredGdd = roundDayC(measuredGdd);

  const forecastDates: string[] = [];
  const metDates = new Set<string>();
  for (const row of forecastHourly) {
    const d = row.datetime.split("T")[0] ?? "";
    if (d >= today) metDates.add(d);
  }
  const sortedMet = [...metDates].sort();
  if (sortedMet.length > 0) {
    forecastDates.push(...sortedMet);
  }

  const forecastPeriodStart = forecastDates[0] ?? null;
  const forecastPeriodEnd =
    forecastDates.length > 0
      ? forecastDates[forecastDates.length - 1]
      : null;

  let forecastGdd = 0;
  let running = measuredGdd;
  let thresholdReachedInForecast = false;
  let forecastOnsetDate: string | null = null;

  if (!thresholdReachedInMeasured) {
    for (const date of forecastDates) {
      const avg = dailyAvgFromHourly(forecastHourly, date);
      if (avg == null) {
        forecastMissingCount += 1;
        continue;
      }
      const add = gddForDay(avg, base);
      forecastGdd += add;
      running = roundDayC(running + add);
      if (!thresholdReachedInForecast && running >= threshold) {
        thresholdReachedInForecast = true;
        forecastOnsetDate = date;
        break;
      }
    }
  }
  forecastGdd = roundDayC(forecastGdd);
  const totalGddThroughForecastDayC = roundDayC(measuredGdd + forecastGdd);

  const missingDailyCount = measuredMissingCount + forecastMissingCount;
  const expectedMeasuredDays = measuredDates.length;
  const measuredMissingRatio =
    expectedMeasuredDays > 0 ? measuredMissingCount / expectedMeasuredDays : 0;

  let dataQuality: MarssoninaGddDataQuality = "full";
  if (measuredMissingCount > 0 || forecastMissingCount > 0) {
    dataQuality = "degraded";
  }
  if (
    measuredMissingCount > 0 &&
    (measuredMissingRatio > 0.1 || measuredMissingCount > 5)
  ) {
    dataQuality = "insufficient";
  }

  const thresholdReached =
    thresholdReachedInMeasured || thresholdReachedInForecast;

  let estimatedOnsetDate: string | null = null;
  let onsetSource: MarssoninaGddOnsetSource = null;
  if (thresholdReachedInMeasured && measuredOnsetDate) {
    estimatedOnsetDate = measuredOnsetDate;
    onsetSource = "measured";
  } else if (thresholdReachedInForecast && forecastOnsetDate) {
    estimatedOnsetDate = forecastOnsetDate;
    onsetSource = "forecast";
  }

  let thresholdStatusLabel: string;
  if (dataQuality === "insufficient") {
    thresholdStatusLabel = `判定保留（欠測 ${missingDailyCount} 日・積算 ${totalGddThroughForecastDayC}/${threshold} 日℃）`;
  } else if (thresholdReachedInMeasured) {
    thresholdStatusLabel = `到達（実測 ${measuredGdd} 日℃・${threshold} 日℃ 以上）`;
  } else if (thresholdReachedInForecast) {
    thresholdStatusLabel = `到達見込（実測 ${measuredGdd}+予報 ${forecastGdd} 日℃）`;
  } else {
    thresholdStatusLabel = `未到達（実測 ${measuredGdd} 日℃、予報込 ${totalGddThroughForecastDayC} 日℃／目安 ${threshold} 日℃）`;
  }

  let predictedOnsetWindow: string;
  if (dataQuality === "insufficient") {
    predictedOnsetWindow = "予測データ不足（日次欠測が多い）";
  } else if (estimatedOnsetDate) {
    predictedOnsetWindow =
      onsetSource === "forecast"
        ? `${estimatedOnsetDate}（MET Norway 予報期間内の推定）`
        : `${estimatedOnsetDate}（NASA POWER 実測に基づく推定）`;
  } else {
    predictedOnsetWindow = `予報期間内では ${threshold} 日℃に到達せず（実測 ${measuredGdd}、予報込 ${totalGddThroughForecastDayC} 日℃）`;
  }

  const modelConfidence: "低" | "中" =
    dataQuality === "full" && thresholdReached ? "中" : "低";

  return {
    gddStartDate,
    gddStartAssumption: MARSSONINA_GDD_START_ASSUMPTION,
    baseTempC: base,
    thresholdDayC: threshold,
    measuredGddDayC: measuredGdd,
    forecastGddDayC: forecastGdd,
    totalGddThroughForecastDayC,
    missingDailyCount,
    measuredPeriodStart: gddStartDate,
    measuredPeriodEnd: measuredEnd,
    forecastPeriodStart,
    forecastPeriodEnd,
    thresholdReached,
    thresholdReachedInMeasured,
    thresholdReachedInForecast,
    estimatedOnsetDate,
    onsetSource,
    dataQuality,
    modelConfidence,
    thresholdStatusLabel,
    predictedOnsetWindow,
  };
}

/** 単体テスト用: 日次系列から GDD（欠測日は加算しない） */
export function sumGddFromDailySeries(
  records: DailyWeatherRecord[],
  startDate: string,
  endDate: string,
  baseTemp = MARSSONINA_GDD_BASE_C
): number {
  return calculateGddFromDaily(records, startDate, endDate, baseTemp);
}
