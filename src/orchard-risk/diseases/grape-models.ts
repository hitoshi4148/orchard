import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcGrapeAnthracnose } from "./grape-anthracnose";
import { calcGrapeBlackRot } from "./grape-black-rot";
import { calcGrapeDownyMildew } from "./grape-downy-mildew";
import { calcGrapeGrayMold } from "./grape-gray-mold";
import { calcGrapeLateRot } from "./grape-late-rot";
import {
  adjustWeatherForGrapeCultivation,
  grapeCultivationRationaleSuffix,
} from "../grape-cultivation-weather";
import {
  CropDiseaseContext,
  DEFAULT_CROP_DISEASE_CONTEXT,
} from "./crop-disease-context";

type GrapeCalc = (
  input: DiseaseWeatherInput,
  ctx: CropDiseaseContext
) => InfectionCalcResult;

const GRAPE_CALCULATORS: Record<string, GrapeCalc> = {
  "grape:downy_mildew": calcGrapeDownyMildew,
  "grape:black_rot": calcGrapeBlackRot,
  "grape:late_rot": calcGrapeLateRot,
  "grape:gray_mold": calcGrapeGrayMold,
  "grape:anthracnose": calcGrapeAnthracnose,
};

export function calcGrapeDisease(
  diseaseId: string,
  input: DiseaseWeatherInput,
  ctx: CropDiseaseContext = DEFAULT_CROP_DISEASE_CONTEXT
): InfectionCalcResult {
  const calc = GRAPE_CALCULATORS[diseaseId];
  if (!calc) {
    return { percent: null, rationale: "未定義のぶどう病害 ID です。" };
  }
  const cultivationId = ctx.cultivationId ?? "open";
  const adjusted = adjustWeatherForGrapeCultivation(input, cultivationId);
  const result = calc(adjusted, ctx);
  return {
    ...result,
    rationale:
      (result.rationale ?? "") +
      grapeCultivationRationaleSuffix(cultivationId),
  };
}

export function listGrapeDiseaseModelIds(): string[] {
  return Object.keys(GRAPE_CALCULATORS).sort();
}
