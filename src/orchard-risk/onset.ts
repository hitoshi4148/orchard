import { calculateGddFromDaily } from "../gdd/fetch-gdd";
import { DailyWeatherRecord } from "../disease/nasa-power";
import {
  addDaysToDateString,
  jstTodayString,
} from "../disease/met-norway-forecast";
import { MarssoninaGddEstimate } from "./marssonina-gdd";
import { MarssoninaInfectionSearchResult } from "./marssonina-infection";
import { OrchardOnsetRow, RiskLevel } from "./types";
import { percentToInfectionLevel } from "./risk-level";

const MARSSONINA_BASE = 4.6;
const MARSSONINA_THRESHOLD = 159;

function findRecentHighInfectionDate(
  levelsByDate: { date: string; level: RiskLevel }[]
): string | null {
  for (let i = levelsByDate.length - 1; i >= 0; i -= 1) {
    if (levelsByDate[i].level === "high" || levelsByDate[i].level === "caution") {
      return levelsByDate[i].date;
    }
  }
  return null;
}

/** P1: 開花始期未設定 */
export function buildMarssoninaBloomUnsetOnset(): OrchardOnsetRow {
  return {
    diseaseId: "apple:marssonina",
    estimatedInfectionDate: "—",
    gddSinceInfectionDayC: null,
    predictedOnsetWindow: "—",
    confidence: "低",
    note: "開花始期未設定 — 一次感染・発病予測を計算するには開花始期（YYYY-MM-DD）を指定してください。",
    modelStatus: "gdd",
    isDemo: false,
    marssoninaStatus: "bloom_date_unset",
    bloomStart: null,
  };
}

function marssoninaGddFields(gdd: MarssoninaGddEstimate | null) {
  if (!gdd) {
    return {
      gddSinceInfectionDayC: null as number | null,
      marssoninaGdd: undefined,
      dataQuality: undefined,
      modelConfidence: undefined as "低" | "中" | undefined,
    };
  }
  return {
    gddSinceInfectionDayC: gdd.measuredGddDayC,
    marssoninaGdd: {
      gddStartDate: gdd.gddStartDate,
      gddStartAssumption: gdd.gddStartAssumption,
      baseTempC: gdd.baseTempC,
      thresholdDayC: gdd.thresholdDayC,
      measuredGddDayC: gdd.measuredGddDayC,
      forecastGddDayC: gdd.forecastGddDayC,
      totalGddThroughForecastDayC: gdd.totalGddThroughForecastDayC,
      missingDailyCount: gdd.missingDailyCount,
      measuredPeriodStart: gdd.measuredPeriodStart,
      measuredPeriodEnd: gdd.measuredPeriodEnd,
      forecastPeriodStart: gdd.forecastPeriodStart,
      forecastPeriodEnd: gdd.forecastPeriodEnd,
      thresholdStatusLabel: gdd.thresholdStatusLabel,
      estimatedOnsetDate: gdd.estimatedOnsetDate,
      onsetSource: gdd.onsetSource,
      dataQuality: gdd.dataQuality,
      modelConfidence: gdd.modelConfidence,
    },
    dataQuality: gdd.dataQuality,
    modelConfidence: gdd.modelConfidence,
  };
}

/** P2+P3: 気象探索と GDD による発病時期推定 */
export function buildMarssoninaOnsetFromSearch(
  bloomStart: string,
  search: MarssoninaInfectionSearchResult,
  gdd: MarssoninaGddEstimate | null = null
): OrchardOnsetRow {
  const gddFields = marssoninaGddFields(gdd);
  const base = {
    diseaseId: "apple:marssonina" as const,
    ...gddFields,
    confidence: (gdd?.modelConfidence ?? "低") as "低" | "中",
    modelStatus: "gdd" as const,
    isDemo: false,
    bloomStart,
    marssoninaStatus: search.marssoninaStatus,
    weatherCoverage: search.coverage,
    primaryInfection: search.primary,
    marssoninaNasaWindow: {
      fetchStart: search.nasaWindow.fetchStart,
      fetchEnd: search.nasaWindow.fetchEnd,
      hourlyCount: search.hourlyCount,
      requestedDays: search.nasaWindow.requestedDays,
    },
  };

  const gddAssumptionNote =
    "積算起算: 一次感染開始日（推定）当日を含む（猫塚ほか 2023・159日℃・基準4.6℃）。一次感染開始日は P2c+ Phase1（降水日・時別≥0.5mm/h・NASA POWER 格子）による推定です。";

  if (search.marssoninaStatus === "primary_infection_estimated" && search.primary) {
    const p = search.primary;
  const predicted =
      gdd?.predictedOnsetWindow ?? "—（積算データ未取得）";
    return {
      ...base,
      estimatedInfectionDate: p.infectionDate,
      predictedOnsetWindow: predicted,
      note:
        `一次感染開始日（推定）: 降水日 ${p.infectionDate}・時別≥0.5mm 濡れ ${p.wetDurationHours}h（${p.periodStart}〜${p.periodEnd}）・平均 ${p.wetAvgTempC}℃（NASA 格子）。` +
        ` ${gddAssumptionNote}` +
        (gdd
          ? ` 感染後積算（実測）${gdd.measuredGddDayC} 日℃、予報込 ${gdd.totalGddThroughForecastDayC} 日℃。欠測日 ${gdd.missingDailyCount} 日。データ品質=${gdd.dataQuality}、モデル信頼度=${gdd.modelConfidence}。`
          : ""),
    };
  }

  if (search.marssoninaStatus === "partial_infection_reference" && search.primary) {
    const p = search.primary;
    const missing = search.nasaWindow.expectedExplorationHours - search.hourlyCount;
    return {
      ...base,
      estimatedInfectionDate: p.infectionDate,
      predictedOnsetWindow: "—（一次感染候補が参考のため GDD 未接続）",
      note:
        `取得範囲内の感染候補（参考）: 濡れ ${p.wetDurationHours}h（${p.periodStart}〜${p.periodEnd}）・平均 ${p.wetAvgTempC}℃。` +
        `開花始期 ${search.nasaWindow.bloomStart}〜${search.nasaWindow.fetchEnd} の全時刻を取得できていないため、正式な一次感染候補とはしません（欠損おおよそ ${Math.max(0, missing)} 時間）。`,
    };
  }

  if (search.marssoninaStatus === "no_infection_event") {
    return {
      ...base,
      estimatedInfectionDate: "—",
      predictedOnsetWindow: "—",
      primaryInfection: null,
      note:
        `開花始期 ${bloomStart} 以降、探索範囲（${search.nasaWindow.fetchStart}〜${search.nasaWindow.fetchEnd}）で条件を満たす推定濡れは見つかりませんでした。`,
    };
  }

  if (search.marssoninaStatus === "insufficient_weather_coverage") {
    return {
      ...base,
      estimatedInfectionDate: "—",
      predictedOnsetWindow: "—",
      primaryInfection: null,
      note:
        `予測データ不足: 開花始期 ${search.nasaWindow.bloomStart}〜${search.nasaWindow.fetchEnd} の時別データが欠損があり、全期間の探索が完了していません。` +
        `候補なしと断定しません。`,
    };
  }

  if (search.marssoninaStatus === "insufficient_weather") {
    return {
      ...base,
      estimatedInfectionDate: "—",
      predictedOnsetWindow: "—",
      primaryInfection: null,
      note: `予測データ不足: NASA POWER 時別気象を十分に取得できませんでした（${search.hourlyCount} 件）。`,
    };
  }

  return {
    ...base,
    estimatedInfectionDate: "—",
    predictedOnsetWindow: "—",
    note: `開花始期 ${bloomStart} — 褐斑発病の状態を判定できませんでした。`,
  };
}

/** @deprecated P2 で濡れイベント + GDD に置換。P1 では呼ばない */
export function buildMarssoninaOnset(
  nasaDaily: DailyWeatherRecord[],
  recentDailyLevels: { date: string; level: RiskLevel }[]
): OrchardOnsetRow {
  const infectionDate = findRecentHighInfectionDate(recentDailyLevels);
  const yesterday = addDaysToDateString(jstTodayString(), -1);

  if (!infectionDate) {
    return {
      diseaseId: "apple:marssonina",
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "直近の高リスク日なし（NASA POWER 日次）",
      confidence: "低",
      note: "褐斑病 GDD: 感染推定日が見つかりません。",
      modelStatus: "gdd",
      isDemo: false,
    };
  }

  const gdd = calculateGddFromDaily(
    nasaDaily,
    infectionDate,
    yesterday,
    MARSSONINA_BASE
  );

  const remaining = MARSSONINA_THRESHOLD - gdd;
  let window = "潜伏期積算が閾値に達していない可能性（継続観察）";
  if (gdd >= MARSSONINA_THRESHOLD) {
    window = `${addDaysToDateString(jstTodayString(), 0)} 〜 ${addDaysToDateString(jstTodayString(), 7)}（閾値到達）`;
  } else if (remaining <= 40) {
    window = `${addDaysToDateString(jstTodayString(), 3)} 〜 ${addDaysToDateString(jstTodayString(), 12)}`;
  }

  return {
    diseaseId: "apple:marssonina",
    estimatedInfectionDate: infectionDate,
    gddSinceInfectionDayC: gdd,
    predictedOnsetWindow: window,
    confidence: gdd >= MARSSONINA_THRESHOLD ? "中" : "低",
    note: `褐斑病: NASA POWER 日平均・基準 ${MARSSONINA_BASE}℃・閾値 ${MARSSONINA_THRESHOLD}日℃（研究パラメータ・りんご専用）。`,
    modelStatus: "gdd",
    isDemo: false,
  };
}

export function buildAppleScabOnset(): OrchardOnsetRow {
  return {
    diseaseId: "apple:scab",
    estimatedInfectionDate: "—",
    gddSinceInfectionDayC: null,
    predictedOnsetWindow: "潜伏期モデル未接続",
    confidence: "低",
    note: "りんご黒星病: 5日間の感染危険は Mills 法（MET+NASA）で算出。発病時期予測は次フェーズ。",
    modelStatus: "mills",
    isDemo: false,
  };
}

export function buildNashiScabOnset(): OrchardOnsetRow {
  return {
    diseaseId: "nashi:scab",
    estimatedInfectionDate: "—",
    gddSinceInfectionDayC: null,
    predictedOnsetWindow: "Duthie モデル未接続",
    confidence: "低",
    note: "なし黒星病: Duthie モデル実装後に発病予測を表示します（現状は感染危険のみ暫定）。",
    modelStatus: "duthie",
    isDemo: true,
  };
}

export function buildDemoOnset(
  diseaseId: string,
  name: string
): OrchardOnsetRow {
  return {
    diseaseId,
    estimatedInfectionDate: "—",
    gddSinceInfectionDayC: null,
    predictedOnsetWindow: "モデル未接続",
    confidence: "低",
    note: `${name}: 発病予測モデルは次フェーズで接続予定（デモ表示）。`,
    modelStatus: "demo",
    isDemo: true,
  };
}

export function infectionPercentToLevel(
  percent: number | null
): RiskLevel {
  return percentToInfectionLevel(percent) ?? "low";
}
