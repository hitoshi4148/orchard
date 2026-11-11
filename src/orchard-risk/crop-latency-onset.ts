import { addDaysToDateString } from "../disease/met-norway-forecast";
import {
  CropOnsetCatalogEntry,
  getCropOnsetCatalogEntry,
} from "./onset-catalog";
import { OrchardDailyWeather, OrchardOnsetRow, RiskLevel } from "./types";

const LEVEL_SCORE: Record<RiskLevel, number> = {
  low: 0,
  caution: 1,
  high: 2,
};

export function findInfectionPeakInLevels(
  levels: RiskLevel[]
): { peakOffset: number; peakScore: number; peakLevel: RiskLevel } {
  let peakOffset = -1;
  let peakScore = 0;
  let peakLevel: RiskLevel = "low";
  for (let i = 0; i < levels.length; i += 1) {
    const s = LEVEL_SCORE[levels[i]] ?? 0;
    if (s > peakScore) {
      peakScore = s;
      peakOffset = i;
      peakLevel = levels[i];
    }
  }
  return { peakOffset, peakScore, peakLevel };
}

function gddThroughDaily(
  days: OrchardDailyWeather[],
  startDate: string,
  endDate: string,
  baseTempC: number
): number {
  let total = 0;
  for (const day of days) {
    if (day.date < startDate || day.date > endDate) continue;
    total += Math.max(0, day.avgTemp - baseTempC);
  }
  return Math.round(total * 10) / 10;
}

function firstGddReachDate(
  days: OrchardDailyWeather[],
  infectionDate: string,
  baseTempC: number,
  thresholdDayC: number
): { date: string | null; gdd: number } {
  let cumulative = 0;
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sorted) {
    if (day.date < infectionDate) continue;
    cumulative += Math.max(0, day.avgTemp - baseTempC);
    cumulative = Math.round(cumulative * 10) / 10;
    if (cumulative >= thresholdDayC) {
      return { date: day.date, gdd: cumulative };
    }
  }
  return { date: null, gdd: cumulative };
}

/** Phase 2 — ぶどう・もも: 6日感染ピーク日 + 潜伏期／簡易 GDD で発病目安 */
export function buildCropDiseaseOnsetFromWeather(
  diseaseId: string,
  displayName: string,
  levels: RiskLevel[],
  weather5d: OrchardDailyWeather[],
  catalogOverride?: CropOnsetCatalogEntry | null
): OrchardOnsetRow {
  const catalog =
    catalogOverride ?? getCropOnsetCatalogEntry(diseaseId);
  const { peakOffset, peakScore, peakLevel } = findInfectionPeakInLevels(
    levels
  );

  if (!catalog) {
    return {
      diseaseId,
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "モデル未接続",
      confidence: "低",
      note: `${displayName}: 発病カタログ未登録（簡易のみ）。`,
      modelStatus: "demo",
      isDemo: true,
    };
  }

  if (peakOffset < 0 || peakScore === 0) {
    return {
      diseaseId,
      estimatedInfectionDate: "—",
      gddSinceInfectionDayC: null,
      predictedOnsetWindow: "6日予報内で注意以上の感染危険なし",
      confidence: "低",
      note: `${displayName}: 6日間の感染危険はいずれも低め（潜伏期モデルは未起動）。参照: ${catalog.reference}`,
      modelStatus: catalog.gddThresholdDayC ? "gdd" : "seasonal",
      isDemo: false,
    };
  }

  const peakDay = weather5d[peakOffset];
  const infectionDate =
    peakDay?.date ??
    (peakOffset === 0 ? "本日" : `${peakOffset}日先`);
  const dayLabel = peakOffset === 0 ? "本日" : `${peakOffset}日先`;

  let predictedOnsetWindow = "—";
  let gddSinceInfectionDayC: number | null = null;
  let confidence: "高" | "中" | "低" = peakScore >= 2 ? "中" : "低";
  let gddNote = "";

  const useGdd =
    catalog.method === "latency_or_gdd" &&
    catalog.gddBaseC != null &&
    catalog.gddThresholdDayC != null &&
    peakDay?.date;

  if (useGdd && peakDay) {
    const reach = firstGddReachDate(
      weather5d,
      peakDay.date,
      catalog.gddBaseC!,
      catalog.gddThresholdDayC!
    );
    gddSinceInfectionDayC = reach.gdd;
    if (reach.date) {
      predictedOnsetWindow = `${reach.date}頃（積算 ${catalog.gddThresholdDayC}日℃ 到達・6日予報内）`;
      confidence = peakScore >= 2 ? "高" : "中";
      gddNote = `基準 ${catalog.gddBaseC}℃・閾値 ${catalog.gddThresholdDayC}日℃。`;
    } else {
      const start = addDaysToDateString(
        peakDay.date,
        catalog.latencyDaysMin
      );
      const end = addDaysToDateString(peakDay.date, catalog.latencyDaysMax);
      predictedOnsetWindow = `${start}〜${end}（予報内で GDD 未到達・潜伏期目安）`;
      gddNote = `予報期間内の積算は ${reach.gdd} 日℃（閾値 ${catalog.gddThresholdDayC}）。文献潜伏期で補完。`;
    }
  } else if (peakDay?.date) {
    const start = addDaysToDateString(
      peakDay.date,
      catalog.latencyDaysMin
    );
    const end = addDaysToDateString(peakDay.date, catalog.latencyDaysMax);
    predictedOnsetWindow = `${start}〜${end}（潜伏期 ${catalog.latencyDaysMin}–${catalog.latencyDaysMax} 日）`;
    if (peakScore >= 2) confidence = "中";
  } else {
    predictedOnsetWindow = `${dayLabel}前後 +${catalog.latencyDaysMin}–${catalog.latencyDaysMax} 日（日付未取得・オフセット）`;
  }

  const infectionLabel =
    typeof infectionDate === "string" && infectionDate.includes("-")
      ? infectionDate
      : `${dayLabel}（${infectionDate}）`;

  return {
    diseaseId,
    estimatedInfectionDate: infectionLabel,
    gddSinceInfectionDayC,
    predictedOnsetWindow,
    confidence,
    note: `${displayName}: 感染危険ピーク ${dayLabel}（${peakLevel}）。${gddNote}参照: ${catalog.reference}`,
    modelStatus: useGdd ? "gdd" : "seasonal",
    isDemo: false,
  };
}
