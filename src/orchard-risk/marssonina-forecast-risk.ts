import { DiseaseWeatherInput } from "../disease/types";
import { filterHourlyInWindow } from "../disease/models/risk-utils";
import {
  MARSSONINA_GDD_THRESHOLD_DAYC,
  MARSSONINA_PRECIP_WET_MM_H,
  MARSSONINA_WET_AVG_TEMP_MIN_C,
  MARSSONINA_WET_DURATION_MIN_H,
} from "./marssonina-constants";
import { InfectionCalcResult } from "./infection-calculators";
import { calcWetTempHeuristic } from "./infection-calculators";

export interface MarssoninaForecastContext {
  primaryInfectionDate: string | null;
  /** 感染後〜予報末尾までの積算（日℃） */
  totalGddDayC: number | null;
}

function targetDateKeyJst(targetDateTime: string): string {
  const d = new Date(targetDateTime);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

function isPrecipWetHour(row: DiseaseWeatherInput["hourly"][number]): boolean {
  const p = row.precipitation_mm ?? 0;
  return p >= MARSSONINA_PRECIP_WET_MM_H && row.temperature != null;
}

/**
 * 6日間感染危険（MET 予報）— 一次感染開始後の「降水日型」濡れを簡易評価。
 * 発病予測（P2/P3）は別途 onset で算出。
 */
export function calcMarssoninaForecastInfection(
  input: DiseaseWeatherInput,
  ctx: MarssoninaForecastContext | null
): InfectionCalcResult {
  if (!ctx?.primaryInfectionDate) {
    return calcWetTempHeuristic(input, {
      tempMin: 22,
      tempMax: 30,
      diseaseLabel: "りんご褐斑病",
      wetHoursHigh: 10,
      wetHoursCaution: 5,
    });
  }

  const targetKey = targetDateKeyJst(input.targetDateTime);
  if (targetKey < ctx.primaryInfectionDate) {
    return {
      percent: 6,
      rationale:
        "りんご褐斑病: 推定一次感染開始日より前のため、二次感染危険は低めに表示（発病予測は onset 参照）。",
    };
  }

  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 24);
  const precipWet = window.filter(isPrecipWetHour);
  const precipWetCount = precipWet.length;

  if (window.length < 6) {
    return {
      percent: null,
      rationale:
        "りんご褐斑病: 24h 予報が不足しているため感染危険を算出できませんでした。",
    };
  }

  let avgTemp = 0;
  if (precipWetCount > 0) {
    avgTemp =
      precipWet.reduce((s, r) => s + (r.temperature as number), 0) /
      precipWetCount;
  }

  let percent = 12;
  let detail = `24h 内の降水濡れ（≥${MARSSONINA_PRECIP_WET_MM_H}mm/h）${precipWetCount}h`;

  if (
    precipWetCount >= MARSSONINA_WET_DURATION_MIN_H &&
    avgTemp >= MARSSONINA_WET_AVG_TEMP_MIN_C
  ) {
    percent = 82;
    detail += `・平均 ${avgTemp.toFixed(1)}℃ — P2 降水日条件に近い`;
  } else if (
    precipWetCount >= 3 &&
    avgTemp >= MARSSONINA_WET_AVG_TEMP_MIN_C
  ) {
    percent = 52;
    detail += `・平均 ${avgTemp.toFixed(1)}℃ — 注意域`;
  } else if (precipWetCount >= 1) {
    percent = 28;
    detail += " — 軽い降水濡れ";
  }

  const gdd = ctx.totalGddDayC;
  if (gdd != null && gdd >= MARSSONINA_GDD_THRESHOLD_DAYC) {
    percent = Math.min(95, percent + 12);
    detail += `。GDD ${gdd.toFixed(0)} 日℃（閾値 ${MARSSONINA_GDD_THRESHOLD_DAYC} 到達後）`;
  } else if (gdd != null && gdd >= MARSSONINA_GDD_THRESHOLD_DAYC - 25) {
    percent = Math.min(90, percent + 6);
    detail += `。GDD ${gdd.toFixed(0)} 日℃（閾値接近）`;
  }

  return {
    percent,
    rationale: `りんご褐斑病（予報二次感染）: ${detail} から ${percent}%（一次開始 ${ctx.primaryInfectionDate}・P2 閾値参照）。`,
  };
}
