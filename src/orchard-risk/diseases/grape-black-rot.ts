import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcGrapeSeasonalHeuristic } from "./grape-season";

/** docs/orchard-disease-models/grape-black_rot.md */
export function calcGrapeBlackRot(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcGrapeSeasonalHeuristic("grape:black_rot", input);
}
