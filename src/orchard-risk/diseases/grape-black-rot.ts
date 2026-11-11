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

const BLACK_ROT_STAGE: Record<string, number> = {
  bud: 1.08,
  leaf: 1.15,
  prebloom: 1.12,
  bloom: 1.1,
  youngfruit: 1.18,
  petalfall: 1.05,
  fruitgrowth: 0.95,
  coloring: 0.82,
  maturity: 0.78,
  postharvest: 0.68,
};

function blackRotStageFactor(growthStageId: string): number {
  return BLACK_ROT_STAGE[growthStageId] ?? 1.0;
}

/** 黒とう — 強雨×若組織ステージ（Guignardia 簡易） */
export function calcGrapeBlackRot(
  input: DiseaseWeatherInput,
  ctx?: CropDiseaseContext
): InfectionCalcResult {
  const params = ORCHARD_HEURISTIC_BY_ID["grape:black_rot"];
  const base = calcWetTempHeuristic(input, params);
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);

  const heavyRainYoung = countHoursWhere(window, (row) => {
    const t = row.temperature ?? NaN;
    const p = row.precipitation_mm ?? 0;
    return p >= 0.5 && t >= 20 && t <= 28;
  });
  let peak6hPrecip = 0;
  for (let i = 0; i < window.length; i += 1) {
    let sum = 0;
    for (let j = i; j < Math.min(window.length, i + 6); j += 1) {
      sum += window[j].precipitation_mm ?? 0;
    }
    peak6hPrecip = Math.max(peak6hPrecip, sum);
  }

  let score = base.percent ?? 8;
  if (heavyRainYoung >= 3) score = Math.min(100, score + 14);
  else if (heavyRainYoung >= 1) score = Math.min(100, score + 7);
  if (peak6hPrecip >= 5) score = Math.min(100, score + 8);

  const month = getJstMonth(input.targetDateTime);
  const season = grapeSeasonFactor("grape:black_rot", month);
  const stage = blackRotStageFactor(ctx?.growthStageId ?? "youngfruit");
  const percent = Math.min(100, Math.round(score * season * stage));
  const doc = orchardDiseaseModelDocPath("grape:black_rot");

  return {
    percent,
    rationale: `ぶどう黒とう病: 強雨適温 ${heavyRainYoung}h・6h降水最大 ${peak6hPrecip.toFixed(1)}mm・生育 ${ctx?.growthStageId ?? "—"} ×${stage.toFixed(2)}（JST ${month}月 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
