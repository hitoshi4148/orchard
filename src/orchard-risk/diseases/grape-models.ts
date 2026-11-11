import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcGrapeAnthracnose } from "./grape-anthracnose";
import { calcGrapeBlackRot } from "./grape-black-rot";
import { calcGrapeDownyMildew } from "./grape-downy-mildew";
import { calcGrapeGrayMold } from "./grape-gray-mold";
import { calcGrapeLateRot } from "./grape-late-rot";

const GRAPE_CALCULATORS: Record<
  string,
  (input: DiseaseWeatherInput) => InfectionCalcResult
> = {
  "grape:downy_mildew": calcGrapeDownyMildew,
  "grape:black_rot": calcGrapeBlackRot,
  "grape:late_rot": calcGrapeLateRot,
  "grape:gray_mold": calcGrapeGrayMold,
  "grape:anthracnose": calcGrapeAnthracnose,
};

export function calcGrapeDisease(
  diseaseId: string,
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const calc = GRAPE_CALCULATORS[diseaseId];
  if (!calc) {
    return { percent: null, rationale: "未定義のぶどう病害 ID です。" };
  }
  return calc(input);
}

export function listGrapeDiseaseModelIds(): string[] {
  return Object.keys(GRAPE_CALCULATORS).sort();
}
