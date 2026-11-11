import {
  filterHourlyInWindow,
  getJstMonth,
} from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { isHourWet } from "../../disease/wetness";
import { InfectionCalcResult } from "../infection-calculators";
import { CropDiseaseContext } from "./crop-disease-context";
import { orchardDiseaseModelDocPath } from "./crop-model-doc";
import { peachSeasonFactor } from "./peach-season";
import { maxConsecutiveHours, countHoursWhere } from "./wet-period-utils";

const TEMP_MIN = 18;
const TEMP_MAX = 24;

const SCAB_STAGE: Record<string, number> = {
  bud: 0.9,
  leaf: 1.15,
  prebloom: 1.1,
  bloom: 1.05,
  petalfall: 1.08,
  youngfruit: 1.12,
  fruitgrowth: 1.0,
  coloring: 0.85,
  maturity: 0.8,
  postharvest: 0.7,
};

function scabStageFactor(growthStageId: string): number {
  return SCAB_STAGE[growthStageId] ?? 1.0;
}

function isScabIdealHour(row: import("../../disease/nasa-power").HourlyWeatherRecord): boolean {
  if (!isHourWet(row)) return false;
  const t = row.temperature ?? NaN;
  return t >= TEMP_MIN && t <= TEMP_MAX;
}

/** もも黒星 — 適温連続濡れ＋展葉〜幼果ステージ */
export function calcPeachScab(
  input: DiseaseWeatherInput,
  ctx?: CropDiseaseContext
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);
  const idealWet = countHoursWhere(window, isScabIdealHour);
  const maxStreak = maxConsecutiveHours(window, isScabIdealHour);
  const withPrecip = countHoursWhere(
    window,
    (row) => isScabIdealHour(row) && (row.precipitation_mm ?? 0) >= 0.1
  );

  let score = 8;
  if (idealWet >= 8) score = 76;
  else if (idealWet >= 4) score = 50;
  else if (idealWet >= 2) score = 24;

  if (maxStreak >= 6) score = Math.min(98, score + 10);
  else if (maxStreak >= 4) score = Math.min(98, score + 6);
  if (withPrecip >= 2) score = Math.min(100, score + 5);

  const month = getJstMonth(input.targetDateTime);
  const season = peachSeasonFactor("peach:scab", month);
  const stage = scabStageFactor(ctx?.growthStageId ?? "youngfruit");
  const percent = Math.min(100, Math.round(score * season * stage));
  const doc = orchardDiseaseModelDocPath("peach:scab");

  return {
    percent,
    rationale: `もも黒星病: 適温濡れ ${idealWet}h・連続 ${maxStreak}h・降水 ${withPrecip}h・生育 ${ctx?.growthStageId ?? "—"} ×${stage.toFixed(2)}（JST ${month}月 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
