import { calculateGddFromDaily } from "../gdd/fetch-gdd";
import { findLatestMillsInfectionEventWhen } from "../disease/models/apple-scab";
import {
  evaluateAppleScabPrimarySeason,
  isJstDateInAppleScabWindow,
  getAppleScabSeasonWindow,
} from "./apple-scab-season";
import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { findLatestNashiScabInfectionEvent } from "./nashi-scab-ishii";
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

function formatJstDateFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function buildAppleScabOnsetFromHourly(
  hourly: HourlyWeatherRecord[],
  targetDateTime: string,
  lat: number,
  growthStageId: string
): OrchardOnsetRow {
  const season = evaluateAppleScabPrimarySeason(
    lat,
    targetDateTime,
    growthStageId
  );
  const window = getAppleScabSeasonWindow(lat);

  if (!season.inPrimarySeason) {
    return {
      diseaseId: "apple:scab",
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "升孢子簡易季節窓の対象外",
      confidence: "低",
      note: `りんご黒星病: ${season.reason}`,
      modelStatus: "mills",
      isDemo: false,
    };
  }

  const latest = findLatestMillsInfectionEventWhen(
    hourly,
    targetDateTime,
    (endIso) =>
      isJstDateInAppleScabWindow(endIso, window) &&
      evaluateAppleScabPrimarySeason(lat, endIso, growthStageId)
        .inPrimarySeason
  );

  if (!latest) {
    return {
      diseaseId: "apple:scab",
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "監視期内で Mills 感染イベントなし",
      confidence: "低",
      note: `りんご黒星病: 6日感染表は Mills 法（${season.reason}）。`,
      modelStatus: "mills",
      isDemo: false,
    };
  }

  const infectionDate = formatJstDateFromIso(latest.wetPeriod.endDateTime);
  const ratio = latest.severityRatio;
  const confidence = ratio >= 1.5 ? "中" : "低";

  return {
    diseaseId: "apple:scab",
    estimatedInfectionDate: infectionDate,
    gddSinceInfectionDayC: null,
    predictedOnsetWindow:
      "感染イベント後 約9–17日に初発の目安（品種・管理により変動・参考文献レンジ）",
    confidence,
    note:
      `直近の Mills 感染イベント: 濡れ ${latest.wetPeriod.durationHours.toFixed(1)}h（必要 ${latest.requiredHours}h）・平均 ${latest.wetPeriod.averageTemperature.toFixed(1)}℃（${latest.wetPeriod.startDateTime}〜${latest.wetPeriod.endDateTime}）。`,
    modelStatus: "mills",
    isDemo: false,
  };
}

export function buildNashiScabOnsetFromHourly(
  hourly: HourlyWeatherRecord[],
  targetDateTime: string
): OrchardOnsetRow {
  const latest = findLatestNashiScabInfectionEvent(hourly, targetDateTime);
  if (!latest) {
    return {
      diseaseId: "nashi:scab",
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "直近で Ishii 最小濡れ条件を満たす期間なし",
      confidence: "低",
      note:
        "なし黒星病: Ishii & Yanase (2003) 最小濡れモデルで 6 日感染危険を算出。Duthie (2007) 動的発病予測は未接続。",
      modelStatus: "duthie",
      isDemo: false,
    };
  }

  const confidence =
    latest.durationHours >= latest.requiredWetnessHours * 1.3 ? "中" : "低";

  return {
    diseaseId: "nashi:scab",
    estimatedInfectionDate: latest.infectionDateKey,
    gddSinceInfectionDayC: null,
    predictedOnsetWindow:
      "潜伏期は品種・分生胞子帰率により変動（Duthie 動的モデル接続後に精密化）",
    confidence,
    note:
      `Ishii & Yanase 感染候補: 濡れ ${latest.durationHours.toFixed(1)}h（平均 ${latest.averageTemperature.toFixed(1)}℃・必要 ${latest.requiredWetnessHours.toFixed(1)}h）。`,
    modelStatus: "duthie",
    isDemo: false,
  };
}

/** @deprecated buildAppleScabOnsetFromHourly を使用 */
export function buildAppleScabOnset(): OrchardOnsetRow {
  return buildAppleScabOnsetFromHourly([], "", 36.5, "youngfruit");
}

/** @deprecated buildNashiScabOnsetFromHourly を使用 */
export function buildNashiScabOnset(): OrchardOnsetRow {
  return buildNashiScabOnsetFromHourly([], "");
}

/** 簡易モデル: 6日感染表のピークから発病注意ウィンドウの目安 */
export function buildHeuristicOnsetFromInfection(
  diseaseId: string,
  name: string,
  levels: RiskLevel[]
): OrchardOnsetRow {
  let peakOffset = -1;
  let peakScore = 0;
  const score = { low: 0, caution: 1, high: 2 };
  for (let i = 0; i < levels.length; i += 1) {
    const s = score[levels[i]] ?? 0;
    if (s > peakScore) {
      peakScore = s;
      peakOffset = i;
    }
  }

  if (peakOffset < 0 || peakScore === 0) {
    return {
      diseaseId,
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "6日予報内で注意以上の感染危険なし",
      confidence: "低",
      note: `${name}: 簡易モデル（感染危険表）からは発病ピークを検出できませんでした。`,
      modelStatus: "heuristic",
      isDemo: true,
    };
  }

  const dayLabel = peakOffset === 0 ? "本日" : `${peakOffset}日先`;
  const windowEnd = Math.min(peakOffset + 4, 5);

  return {
    diseaseId,
    estimatedInfectionDate: "—",
    gddSinceInfectionDayC: null,
    predictedOnsetWindow:
      peakOffset === windowEnd
        ? `${dayLabel}前後に感染危険ピーク（発病は潜伏期モデル未接続）`
        : `${dayLabel}〜${windowEnd === 0 ? "本日" : `${windowEnd}日先`}に感染危険ピーク（発病は潜伏期モデル未接続）`,
    confidence: peakScore >= 2 ? "中" : "低",
    note: `${name}: 6日感染危険の最大が ${dayLabel}（${levels[peakOffset]}）。潜伏期・母菌量は未モデル化の参考表示です。`,
    modelStatus: "heuristic",
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
