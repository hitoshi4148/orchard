import { calculateGddFromDaily } from "../gdd/fetch-gdd";
import { DailyWeatherRecord } from "../disease/nasa-power";
import {
  addDaysToDateString,
  jstTodayString,
} from "../disease/met-norway-forecast";
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
