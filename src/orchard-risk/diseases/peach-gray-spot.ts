import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcPeachSeasonalHeuristic } from "./peach-season";

export function calcPeachGraySpot(
  input: DiseaseWeatherInput,
  _ctx?: import("./crop-disease-context").CropDiseaseContext
): InfectionCalcResult {
  return calcPeachSeasonalHeuristic("peach:gray_spot", input);
}
