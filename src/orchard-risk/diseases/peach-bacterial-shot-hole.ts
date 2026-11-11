import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcPeachSeasonalHeuristic } from "./peach-season";

export function calcPeachBacterialShotHole(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  return calcPeachSeasonalHeuristic("peach:bacterial_shot_hole", input);
}
