import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcGrapeSeasonalHeuristic } from "./grape-season";

/** docs/orchard-disease-models/grape-late_rot.md */
export function calcGrapeLateRot(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcGrapeSeasonalHeuristic("grape:late_rot", input);
}
