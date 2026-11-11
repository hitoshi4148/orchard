import {
  filterHourlyInWindow,
  getJstMonth,
} from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { isHourWet } from "../../disease/wetness";
import { ORCHARD_HEURISTIC_BY_ID } from "../heuristic-disease";
import { InfectionCalcResult, calcWetTempHeuristic } from "../infection-calculators";
import { CropDiseaseContext } from "./crop-disease-context";
import { orchardDiseaseModelDocPath } from "./crop-model-doc";
import { grapeSeasonFactor } from "./grape-season";
import { countHoursWhere } from "./wet-period-utils";

const GRAY_MOLD_STAGE_FACTOR: Record<string, number> = {
  prebloom: 1.22,
  bloom: 1.28,
  petalfall: 1.2,
  youngfruit: 1.08,
  leaf: 0.95,
  bud: 0.88,
  fruitgrowth: 0.92,
  coloring: 0.78,
  maturity: 0.72,
  postharvest: 0.65,
};

function grayMoldStageFactor(growthStageId: string): number {
  return GRAY_MOLD_STAGE_FACTOR[growthStageId] ?? 1.0;
}

/** 灰色かび — 開花前後ステージ係数 × 涼冷湿（Botrytis 簡易） */
export function calcGrapeGrayMold(
  input: DiseaseWeatherInput,
  ctx?: CropDiseaseContext
): InfectionCalcResult {
  const params = ORCHARD_HEURISTIC_BY_ID["grape:gray_mold"];
  const base = calcWetTempHeuristic(input, params);
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);
  const longCoolWet = countHoursWhere(window, (row) => {
    if (!isHourWet(row)) return false;
    const t = row.temperature ?? NaN;
    return t >= 15 && t <= 22;
  });

  let score = base.percent ?? 8;
  if (longCoolWet >= 10) score = Math.min(100, score + 12);
  else if (longCoolWet >= 6) score = Math.min(100, score + 6);

  const month = getJstMonth(input.targetDateTime);
  const season = grapeSeasonFactor("grape:gray_mold", month);
  const stage = grayMoldStageFactor(ctx?.growthStageId ?? "youngfruit");
  const percent = Math.min(100, Math.round(score * season * stage));
  const doc = orchardDiseaseModelDocPath("grape:gray_mold");

  return {
    percent,
    rationale: `ぶどう灰色かび病: 涼冷濡れ ${longCoolWet}h・生育 ${ctx?.growthStageId ?? "—"} ×${stage.toFixed(2)}（JST ${month}月 季節 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
