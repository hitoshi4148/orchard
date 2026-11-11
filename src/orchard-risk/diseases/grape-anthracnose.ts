import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcGrapeSeasonalHeuristic } from "./grape-season";

/** docs/orchard-disease-models/grape-anthracnose.md */
export function calcGrapeAnthracnose(
  input: DiseaseWeatherInput,
  _ctx?: import("./crop-disease-context").CropDiseaseContext
): InfectionCalcResult {
  return calcGrapeSeasonalHeuristic("grape:anthracnose", input);
}
