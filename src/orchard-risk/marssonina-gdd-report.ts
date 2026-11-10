/**
 * GDD レポート用ヘルパ（比較スクリプト・テスト向け）
 * computeMarssoninaGddEstimate の戻り値を誤参照しないための正規サマリ。
 */
import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import {
  computeMarssoninaGddEstimate,
  MarssoninaGddEstimate,
} from "./marssonina-gdd";

export interface MarssoninaGddReportSummary {
  gddStartDate: string;
  measuredPeriodEnd: string;
  measuredGddDayC: number;
  thresholdDayC: number;
  thresholdReached: boolean;
  thresholdReachedInMeasured: boolean;
  estimatedOnsetDate: string | null;
  thresholdStatusLabel: string;
  missingDailyCount: number;
  missingDailyDates: string[];
  missingBeforeOnsetDates: string[];
  dataQuality: MarssoninaGddEstimate["dataQuality"];
  dataQualityNote: string | null;
}

function isMissingDailyTemp(row: DailyWeatherRecord | undefined): boolean {
  const temp = row?.temperature_avg;
  return (
    row == null ||
    temp == null ||
    Number.isNaN(temp) ||
    temp <= -900
  );
}

export function listMissingDailyDatesInPeriod(
  daily: DailyWeatherRecord[],
  startDate: string,
  endDate: string
): string[] {
  const byDate = new Map(daily.map((r) => [r.date, r]));
  const missing: string[] = [];
  let d = startDate;
  while (d <= endDate) {
    if (isMissingDailyTemp(byDate.get(d))) missing.push(d);
    d = addDaysToDateString(d, 1);
  }
  return missing;
}

export function buildMarssoninaGddReportSummary(
  primaryInfectionStartDate: string,
  daily: DailyWeatherRecord[],
  forecastHourly: HourlyWeatherRecord[],
  yesterday: string,
  today: string
): MarssoninaGddReportSummary {
  const est = computeMarssoninaGddEstimate(
    primaryInfectionStartDate,
    daily,
    forecastHourly,
    yesterday,
    today
  );
  const missingDailyDates = listMissingDailyDatesInPeriod(
    daily,
    primaryInfectionStartDate,
    yesterday
  );
  const onset = est.estimatedOnsetDate;
  const missingBeforeOnsetDates =
    onset == null
      ? missingDailyDates
      : missingDailyDates.filter((d) => d < onset);

  let dataQualityNote: string | null = null;
  if (missingBeforeOnsetDates.length > 0) {
    dataQualityNote = `159℃到達日（${onset ?? "未到達"}）より前に日次気温欠測が ${missingBeforeOnsetDates.length} 日あり。到達日は欠測日を加算せず判定したため、欠測が多い場合は実測初発日が遅れる可能性がある。`;
  } else if (missingDailyDates.length > 0) {
    dataQualityNote = `積算終了付近に欠測 ${missingDailyDates.length} 日（${missingDailyDates.join(", ")}）。159℃到達日判定には影響しない。`;
  }

  return {
    gddStartDate: est.gddStartDate,
    measuredPeriodEnd: est.measuredPeriodEnd,
    measuredGddDayC: est.measuredGddDayC,
    thresholdDayC: est.thresholdDayC,
    thresholdReached: est.thresholdReached,
    thresholdReachedInMeasured: est.thresholdReachedInMeasured,
    estimatedOnsetDate: est.estimatedOnsetDate,
    thresholdStatusLabel: est.thresholdStatusLabel,
    missingDailyCount: est.missingDailyCount,
    missingDailyDates,
    missingBeforeOnsetDates,
    dataQuality: est.dataQuality,
    dataQualityNote,
  };
}

/** レポート用：誤ったプロパティ名を参照していないこと */
export function assertGddEstimateApiShape(est: MarssoninaGddEstimate): void {
  const loose = est as Record<string, unknown>;
  if ("status" in loose || "onsetDate" in loose) {
    throw new Error(
      "MarssoninaGddEstimate must not use legacy fields status/onsetDate"
    );
  }
  if (typeof est.estimatedOnsetDate !== "string" && est.estimatedOnsetDate !== null) {
    throw new Error("estimatedOnsetDate must be string | null");
  }
}
