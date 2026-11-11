import { calculateAppleRingRotRisk } from "../../disease/models/apple-ring-rot";
import { getJstMonth } from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { calcOrchardHeuristicDisease } from "../heuristic-disease";
import { InfectionCalcResult, calcWetTempHeuristic } from "../infection-calculators";

function withSeasonalRingRot(
  input: DiseaseWeatherInput,
  diseaseLabel: string
): InfectionCalcResult {
  const percent = calculateAppleRingRotRisk(input);
  if (percent == null) {
    return {
      percent: null,
      rationale: `${diseaseLabel}: 時別気象が不足しているため算出できませんでした。`,
    };
  }
  const month = getJstMonth(input.targetDateTime);
  return {
    percent,
    rationale: `${diseaseLabel}: 降雨飛散×高温多湿（JST ${month}月の季節係数込み）— ${percent}%（0–100）。`,
  };
}

/** りんご輪紋病 — Botryosphaeria 系（既存季節モデル） */
export function calcAppleBlotch(input: DiseaseWeatherInput): InfectionCalcResult {
  return withSeasonalRingRot(input, "りんご輪紋病");
}

/** りんご斑点落葉病 — 夏期高温×濡れ（簡易＋季節） */
export function calcAppleAlternaria(input: DiseaseWeatherInput): InfectionCalcResult {
  const base = calcOrchardHeuristicDisease("apple:alternaria", input);
  const month = getJstMonth(input.targetDateTime);
  let factor = 0.55;
  if (month >= 6 && month <= 8) factor = 1.15;
  else if (month >= 5 && month <= 9) factor = 1.0;
  const p = base.percent != null ? Math.min(100, Math.round(base.percent * factor)) : null;
  return {
    percent: p,
    rationale: `${base.rationale} 季節補正（JST ${month}月 ×${factor.toFixed(2)}）。`,
  };
}

/** りんご炭疽病 — 果実期の暖湿（簡易） */
export function calcAppleAnthracnose(input: DiseaseWeatherInput): InfectionCalcResult {
  const month = getJstMonth(input.targetDateTime);
  const params =
    month >= 7 && month <= 9
      ? { wetHoursHigh: 5, wetHoursCaution: 2, tempMin: 22, tempMax: 30 }
      : { wetHoursHigh: 6, wetHoursCaution: 3, tempMin: 20, tempMax: 28 };
  const base = calcWetTempHeuristic(input, {
    ...params,
    diseaseLabel: "りんご炭疽病",
  });
  const season =
    month >= 7 && month <= 9 ? 1.12 : month >= 5 && month <= 10 ? 1.0 : 0.65;
  const p =
    base.percent != null ? Math.min(100, Math.round(base.percent * season)) : null;
  return {
    percent: p,
    rationale: `${base.rationale.replace("ヒューリスティック・仮", "果実期暖湿")} JST ${month}月 季節 ×${season.toFixed(2)}。`,
  };
}
