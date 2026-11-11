import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcPeachSeasonalHeuristic } from "./peach-season";

export function calcPeachAnthracnose(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcPeachSeasonalHeuristic("peach:anthracnose", input);
}
