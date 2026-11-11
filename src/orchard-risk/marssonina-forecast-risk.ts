import { addDaysToDateString } from "../disease/met-norway-forecast";
import { DiseaseWeatherInput } from "../disease/types";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import {
  MARSSONINA_GDD_THRESHOLD_DAYC,
  MARSSONINA_WET_AVG_TEMP_MIN_C,
  MARSSONINA_WET_DURATION_MIN_H,
} from "./marssonina-constants";
import { InfectionCalcResult } from "./infection-calculators";
import { calcWetTempHeuristic } from "./infection-calculators";
import { listMarssoninaPrecipDayStats } from "./marssonina-precip-day";

export interface MarssoninaForecastContext {
  primaryInfectionDate: string | null;
  /** 感染後〜予報末尾までの積算（日℃） */
  totalGddDayC: number | null;
  /** 6日表用 — 対象 JST 日までの積算 GDD */
  gddThroughTargetYmd?: (targetYmd: string) => number | null;
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

function scoreMarssoninaP2PrecipDay(
  targetKey: string,
  hourly: HourlyWeatherRecord[]
): { percent: number; detail: string } {
  const windowStart = addDaysToDateString(targetKey, -1);
  const dayStats = listMarssoninaPrecipDayStats(
    hourly,
    windowStart,
    targetKey,
    "phase2"
  );
  const dayStat = dayStats.find((s) => s.precipDay === targetKey);

  let percent = 12;
  let detail = "対象日の P2 鈴木濡れ: 条件未達";

  if (!dayStat) {
    percent = 8;
    detail = "対象日の気象格子が不足";
  } else if (dayStat.incomplete) {
    percent = 18;
    detail = `P2 評価（時刻欠損 ${dayStat.missingHourCount}h）濡れ ${dayStat.wetDurationHours}h`;
  } else if (dayStat.qualifies) {
    percent = 85;
    detail = `P2 降水日合格 — 濡れ ${dayStat.wetDurationHours}h（延長 ${dayStat.extensionWetHourCount ?? 0}h）・平均 ${dayStat.wetAvgTempC?.toFixed(1) ?? "—"}℃`;
  } else if (
    dayStat.wetDurationHours >= 3 &&
    (dayStat.wetAvgTempC ?? 0) >= MARSSONINA_WET_AVG_TEMP_MIN_C
  ) {
    percent = 50;
    detail = `P2 参考 — 濡れ ${dayStat.wetDurationHours}h（必要 ${MARSSONINA_WET_DURATION_MIN_H}h）・平均 ${dayStat.wetAvgTempC?.toFixed(1)}℃`;
  } else if (dayStat.wetDurationHours >= 1) {
    percent = 26;
    detail = `P2 軽微濡れ ${dayStat.wetDurationHours}h（降水 ${dayStat.precipWetHourCount}h）`;
  }

  return { percent, detail };
}

function applyMarssoninaGddBoost(
  percent: number,
  detail: string,
  targetKey: string,
  ctx: MarssoninaForecastContext
): { percent: number; detail: string } {
  const gdd = ctx.gddThroughTargetYmd?.(targetKey) ?? ctx.totalGddDayC;
  let p = percent;
  let d = detail;
  if (gdd != null && gdd >= MARSSONINA_GDD_THRESHOLD_DAYC) {
    p = Math.min(95, p + 12);
    d += `。GDD ${gdd.toFixed(0)} 日℃（閾値 ${MARSSONINA_GDD_THRESHOLD_DAYC} 到達後）`;
  } else if (gdd != null && gdd >= MARSSONINA_GDD_THRESHOLD_DAYC - 25) {
    p = Math.min(90, p + 6);
    d += `。GDD ${gdd.toFixed(0)} 日℃（閾値接近）`;
  }
  return { percent: p, detail: d };
}

/**
 * 6日間感染危険（MET+履歴）— 対象 JST 日の P2 鈴木濡れ延長を評価。
 * 一次感染日が未定でも P2 日次は評価（GDD 補正は一次確定後のみ）。
 * 発病予測（P2/P3 onset）は別 API 経路。
 */
export function calcMarssoninaForecastInfection(
  input: DiseaseWeatherInput,
  ctx: MarssoninaForecastContext | null
): InfectionCalcResult {
  const targetKey = targetDateKeyJst(input.targetDateTime);
  const primary = ctx?.primaryInfectionDate ?? null;

  if (primary && targetKey < primary) {
    return {
      percent: 6,
      rationale:
        "りんご褐斑病: 推定一次感染開始日より前のため、二次感染危険は低めに表示（発病予測は onset 参照）。",
    };
  }

  if (!input.hourly?.length) {
    if (!primary) {
      const h = calcWetTempHeuristic(input, {
        tempMin: 22,
        tempMax: 30,
        diseaseLabel: "りんご褐斑病",
        wetHoursHigh: 10,
        wetHoursCaution: 5,
      });
      return {
        ...h,
        rationale: `${h.rationale} 時別予報が不足しているため P2 評価に切り替えられません。`,
      };
    }
    return {
      percent: null,
      rationale:
        "りんご褐斑病: 時別予報が不足しているため感染危険を算出できませんでした。",
    };
  }

  let { percent, detail } = scoreMarssoninaP2PrecipDay(targetKey, input.hourly);

  if (primary && ctx) {
    ({ percent, detail } = applyMarssoninaGddBoost(
      percent,
      detail,
      targetKey,
      ctx
    ));
    return {
      percent,
      rationale: `りんご褐斑病（予報二次・鈴木延長P2）: ${detail} → ${percent}%（一次開始 ${primary}）。`,
    };
  }

  return {
    percent,
    rationale: `りんご褐斑病（予報・鈴木P2日次）: ${detail} → ${percent}%（一次感染日未定 — GDD 補正なし。開花始期を設定すると一次推定・発病予測が有効）。`,
  };
}
