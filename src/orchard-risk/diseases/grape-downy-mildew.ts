import {
  filterHourlyInWindow,
  getJstMonth,
} from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { isHourWet } from "../../disease/wetness";
import { InfectionCalcResult } from "../infection-calculators";
import { orchardDiseaseModelDocPath } from "./crop-model-doc";
import { grapeSeasonFactor } from "./grape-season";

const TEMP_MIN = 18;
const TEMP_MAX = 25;

/**
 * べと病 — 適温帯の連続濡れ＋降雨時間を重視（Plasmopara 簡易 P2）
 * 設計: docs/orchard-disease-models/grape-downy_mildew.md
 */
export function calcGrapeDownyMildew(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);
  let idealWetHours = 0;
  let precipWetHours = 0;

  for (const row of window) {
    if (!isHourWet(row)) continue;
    const t = row.temperature ?? NaN;
    if (t >= TEMP_MIN && t <= TEMP_MAX) {
      idealWetHours += 1;
    }
    if ((row.precipitation_mm ?? 0) >= 0.1) {
      precipWetHours += 1;
    }
  }

  let score = 8;
  if (idealWetHours >= 8) score = 78;
  else if (idealWetHours >= 4) score = 50;
  else if (idealWetHours >= 2) score = 22;

  if (precipWetHours >= 4) score = Math.min(95, score + 14);
  else if (precipWetHours >= 2) score = Math.min(95, score + 8);

  const month = getJstMonth(input.targetDateTime);
  const season = grapeSeasonFactor("grape:downy_mildew", month);
  const percent = Math.min(100, Math.round(score * season));
  const doc = orchardDiseaseModelDocPath("grape:downy_mildew");

  return {
    percent,
    rationale: `ぶどうべと病: 適温濡れ ${idealWetHours}h（${TEMP_MIN}–${TEMP_MAX}℃）・降水濡れ ${precipWetHours}h（48h・JST ${month}月 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
