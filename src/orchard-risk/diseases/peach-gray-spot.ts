import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcPeachSeasonalHeuristic } from "./peach-season";

export function calcPeachGraySpot(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcPeachSeasonalHeuristic("peach:gray_spot", input);
}
