import { getJstMonth } from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { ORCHARD_HEURISTIC_BY_ID } from "../heuristic-disease";
import { InfectionCalcResult, calcWetTempHeuristic } from "../infection-calculators";
import { orchardDiseaseModelDocPath } from "./crop-model-doc";

export function grapeSeasonFactor(diseaseId: string, month: number): number {
  switch (diseaseId) {
    case "grape:downy_mildew":
      if (month >= 5 && month <= 7) return 1.15;
      if (month >= 4 && month <= 8) return 1.0;
      return 0.45;
    case "grape:black_rot":
      if (month >= 5 && month <= 8) return 1.12;
      if (month >= 4 && month <= 9) return 1.0;
      return 0.5;
    case "grape:late_rot":
      if (month >= 7 && month <= 9) return 1.2;
      if (month >= 6 && month <= 10) return 1.0;
      return 0.55;
    case "grape:gray_mold":
      if (month >= 4 && month <= 6) return 1.18;
      if (month >= 3 && month <= 7) return 1.0;
      return 0.6;
    case "grape:anthracnose":
      if (month >= 6 && month <= 8) return 1.1;
      if (month >= 5 && month <= 9) return 1.0;
      return 0.55;
    default:
      return 1.0;
  }
}

/** 季節 × 適温濡れ（ぶどうの汎用層） */
export function calcGrapeSeasonalHeuristic(
  diseaseId: string,
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const params = ORCHARD_HEURISTIC_BY_ID[diseaseId];
  if (!params) {
    return { percent: null, rationale: "未定義のぶどう病害 ID です。" };
  }
  const base = calcWetTempHeuristic(input, params);
  const month = getJstMonth(input.targetDateTime);
  const season = grapeSeasonFactor(diseaseId, month);
  const p =
    base.percent != null ? Math.min(100, Math.round(base.percent * season)) : null;
  const doc = orchardDiseaseModelDocPath(diseaseId);
  return {
    percent: p,
    rationale: `${params.diseaseLabel}: 適温×濡れ（ぶどう P2・JST ${month}月 季節 ×${season.toFixed(2)}）— ${p ?? "—"}%。設計: ${doc}。参照: ${params.reference}`,
  };
}
