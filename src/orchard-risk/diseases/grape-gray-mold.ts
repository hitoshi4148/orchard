import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcGrapeSeasonalHeuristic } from "./grape-season";

/** docs/orchard-disease-models/grape-gray_mold.md */
export function calcGrapeGrayMold(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcGrapeSeasonalHeuristic("grape:gray_mold", input);
}
