import { calculateGddFromDaily } from "../gdd/fetch-gdd";
import { DailyWeatherRecord } from "../disease/nasa-power";
import {
  addDaysToDateString,
  jstTodayString,
} from "../disease/met-norway-forecast";
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

/** P2: 気象探索結果から褐斑発病行を組み立て（GDD・発病日は未接続） */
export function buildMarssoninaOnsetFromSearch(
  bloomStart: string,
  search: MarssoninaInfectionSearchResult
): OrchardOnsetRow {
  const base = {
    diseaseId: "apple:marssonina" as const,
    gddSinceInfectionDayC: null,
    confidence: "低" as const,
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

  if (search.marssoninaStatus === "primary_infection_estimated" && search.primary) {
    const p = search.primary;
    return {
      ...base,
      estimatedInfectionDate: p.infectionDate,
      predictedOnsetWindow: "—（発病予測・GDD は次フェーズ）",
      note:
        `一次感染候補（推定）: 濡れ ${p.wetDurationHours}h（${p.periodStart}〜${p.periodEnd}）・濡れ中平均 ${p.wetAvgTempC}℃（葉面濡れ推定）。` +
        `候補日は濡れ期間終了日（JST）。猫塚（2023）閾値参考・論文日付定義との一致は未確認。1st 飛散ピークの確定ではありません。`,
    };
  }

  if (search.marssoninaStatus === "partial_infection_reference" && search.primary) {
    const p = search.primary;
    const missing = search.nasaWindow.expectedExplorationHours - search.hourlyCount;
    return {
      ...base,
      estimatedInfectionDate: p.infectionDate,
      predictedOnsetWindow: "—（発病予測・GDD は次フェーズ）",
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
