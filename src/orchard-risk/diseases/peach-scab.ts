import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcPeachSeasonalHeuristic } from "./peach-season";

export function calcPeachScab(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcPeachSeasonalHeuristic("peach:scab", input);
}
