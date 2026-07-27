/**
 * 果樹病害リスク計算ライブラリ
 *
 * 各病害モデル（models/）をレジストリ経由で呼び出し、
 * 気象データから発生リスク（0–100%）を算出する。
 */

export type { DiseaseRiskResult, DiseaseWeatherInput } from "./types";
export { calculateAppleScabRisk } from "./models/apple-scab";
export { calculateValsaCankerRisk } from "./models/valsa-canker";
export { calculatePhytophthoraRisk } from "./models/phytophthora-rot";
export { DISEASE_MODELS, DISEASE_MODEL_BY_KEY } from "./models/registry";
export { millsRequiredWetnessHours } from "./mills-table";
export { findWetPeriods, isHourWet } from "./wetness";

import { DISEASE_MODELS } from "./models/registry";
import { DiseaseRiskResult, DiseaseWeatherInput } from "./types";

/**
 * 全病害のリスクを一括計算
 */
export function calculateAllDiseaseRisks(
  weatherData: DiseaseWeatherInput
): DiseaseRiskResult {
  const result = {} as DiseaseRiskResult;

  for (const model of DISEASE_MODELS) {
    result[model.key] = model.calculate(weatherData);
  }

  return result;
}
