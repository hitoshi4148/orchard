import { getJstMonth } from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { ORCHARD_HEURISTIC_BY_ID } from "../heuristic-disease";
import { InfectionCalcResult, calcWetTempHeuristic } from "../infection-calculators";

function peachSeasonFactor(diseaseId: string, month: number): number {
  switch (diseaseId) {
    case "peach:leaf_curl":
      if (month >= 3 && month <= 4) return 1.25;
      if (month === 2 || month === 5) return 1.0;
      return 0.35;
    case "peach:bacterial_shot_hole":
      if (month >= 4 && month <= 6) return 1.15;
      if (month >= 3 && month <= 7) return 1.0;
      return 0.55;
    case "peach:scab":
      if (month >= 4 && month <= 6) return 1.12;
      if (month >= 3 && month <= 7) return 1.0;
      return 0.5;
    case "peach:gray_spot":
    case "peach:anthracnose":
      if (month >= 6 && month <= 8) return 1.1;
      if (month >= 5 && month <= 9) return 1.0;
      return 0.6;
    default:
      return 1.0;
  }
}

export function calcPeachDisease(
  diseaseId: string,
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const params = ORCHARD_HEURISTIC_BY_ID[diseaseId];
  if (!params) {
    return { percent: null, rationale: "未定義のもも病害 ID です。" };
  }
  const base = calcWetTempHeuristic(input, params);
  const month = getJstMonth(input.targetDateTime);
  const season = peachSeasonFactor(diseaseId, month);
  const p =
    base.percent != null ? Math.min(100, Math.round(base.percent * season)) : null;
  return {
    percent: p,
    rationale: `${params.diseaseLabel}: 適温×濡れ（もも専用・JST ${month}月 季節 ×${season.toFixed(2)}）— ${p ?? "—"}%。参照: ${params.reference}`,
  };
}
