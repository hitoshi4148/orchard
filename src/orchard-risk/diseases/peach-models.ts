import { DiseaseWeatherInput } from "../../disease/types";
import { InfectionCalcResult } from "../infection-calculators";
import { calcPeachAnthracnose } from "./peach-anthracnose";
import { calcPeachBacterialShotHole } from "./peach-bacterial-shot-hole";
import { calcPeachGraySpot } from "./peach-gray-spot";
import { calcPeachLeafCurl } from "./peach-leaf-curl";
import { calcPeachScab } from "./peach-scab";
import {
  CropDiseaseContext,
  DEFAULT_CROP_DISEASE_CONTEXT,
} from "./crop-disease-context";

type PeachCalc = (
  input: DiseaseWeatherInput,
  ctx: CropDiseaseContext
) => InfectionCalcResult;

const PEACH_CALCULATORS: Record<string, PeachCalc> = {
  "peach:bacterial_shot_hole": calcPeachBacterialShotHole,
  "peach:gray_spot": calcPeachGraySpot,
  "peach:scab": calcPeachScab,
  "peach:leaf_curl": calcPeachLeafCurl,
  "peach:anthracnose": calcPeachAnthracnose,
};

export function calcPeachDisease(
  diseaseId: string,
  input: DiseaseWeatherInput,
  ctx: CropDiseaseContext = DEFAULT_CROP_DISEASE_CONTEXT
): InfectionCalcResult {
  const calc = PEACH_CALCULATORS[diseaseId];
  if (!calc) {
    return { percent: null, rationale: "未定義のもも病害 ID です。" };
  }
  return calc(input, ctx);
}

export function listPeachDiseaseModelIds(): string[] {
  return Object.keys(PEACH_CALCULATORS).sort();
}
