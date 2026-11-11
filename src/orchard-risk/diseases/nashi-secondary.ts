import { calculateAppleRingRotRisk } from "../../disease/models/apple-ring-rot";
import { getJstMonth } from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { calcOrchardHeuristicDisease } from "../heuristic-disease";
import { InfectionCalcResult, calcWetTempHeuristic } from "../infection-calculators";

/** なし輪紋病 — 果実期の降雨×湿潤（輪紋系季節モデルを流用） */
export function calcNashiBlotch(input: DiseaseWeatherInput): InfectionCalcResult {
  const percent = calculateAppleRingRotRisk(input);
  if (percent == null) {
    return calcOrchardHeuristicDisease("nashi:blotch", input);
  }
  const month = getJstMonth(input.targetDateTime);
  return {
    percent,
    rationale: `なし輪紋病: 多雨・高湿の熟期リスク（JST ${month}月・輪紋飛散モデル流用）— ${percent}%。`,
  };
}

/** なし黒斑病 — 夏期高温多湿 */
export function calcNashiBlackSpot(input: DiseaseWeatherInput): InfectionCalcResult {
  const month = getJstMonth(input.targetDateTime);
  const boost = month >= 7 && month <= 9 ? 1.15 : month >= 6 && month <= 10 ? 1.0 : 0.7;
  const base = calcOrchardHeuristicDisease("nashi:black_spot", input);
  const p =
    base.percent != null ? Math.min(100, Math.round(base.percent * boost)) : null;
  return {
    percent: p,
    rationale: `${base.rationale} 季節（JST ${month}月 ×${boost.toFixed(2)}）。`,
  };
}

/** なし炭疽病 — 肥大〜熟期 */
export function calcNashiAnthracnose(input: DiseaseWeatherInput): InfectionCalcResult {
  const month = getJstMonth(input.targetDateTime);
  const base = calcWetTempHeuristic(input, {
    diseaseLabel: "なし炭疽病",
    tempMin: 20,
    tempMax: 28,
    wetHoursHigh: 6,
    wetHoursCaution: 3,
  });
  const season = month >= 8 && month <= 10 ? 1.1 : month >= 6 && month <= 11 ? 1.0 : 0.6;
  const p =
    base.percent != null ? Math.min(100, Math.round(base.percent * season)) : null;
  return {
    percent: p,
    rationale: `${base.rationale.replace("ヒューリスティック・仮", "果実期")} JST ${month}月 ×${season.toFixed(2)}。`,
  };
}
