import {
  filterHourlyInWindow,
  getJstMonth,
} from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { isHourWet } from "../../disease/wetness";
import { InfectionCalcResult } from "../infection-calculators";
import { orchardDiseaseModelDocPath } from "./crop-model-doc";
import { peachSeasonFactor } from "./peach-season";

const COOL_MIN = 8;
const COOL_MAX = 18;

/**
 * ももいさか病 — 早春の低温濡れを強調（Taphrina 簡易 P2）
 */
export function calcPeachLeafCurl(
  input: DiseaseWeatherInput,
  _ctx?: import("./crop-disease-context").CropDiseaseContext
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);
  let coolWet = 0;
  let warmWet = 0;

  for (const row of window) {
    if (!isHourWet(row)) continue;
    const t = row.temperature ?? NaN;
    if (t >= COOL_MIN && t <= COOL_MAX) {
      coolWet += 1;
    } else if (t > 20) {
      warmWet += 1;
    }
  }

  let score = 8;
  if (coolWet >= 12) score = 76;
  else if (coolWet >= 6) score = 48;
  else if (coolWet >= 2) score = 22;

  score = Math.max(8, score - Math.min(24, warmWet * 4));

  const month = getJstMonth(input.targetDateTime);
  const season = peachSeasonFactor("peach:leaf_curl", month);
  const percent = Math.min(100, Math.round(score * season));
  const doc = orchardDiseaseModelDocPath("peach:leaf_curl");

  return {
    percent,
    rationale: `ももいさか病: 低温濡れ ${coolWet}h（${COOL_MIN}–${COOL_MAX}℃）・暖湿ペナルティ ${warmWet}h（48h・JST ${month}月 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
