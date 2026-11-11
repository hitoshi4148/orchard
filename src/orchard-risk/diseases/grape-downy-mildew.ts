import {
  filterHourlyInWindow,
  getJstMonth,
} from "../../disease/models/risk-utils";
import { DiseaseWeatherInput } from "../../disease/types";
import { isHourWet } from "../../disease/wetness";
import { InfectionCalcResult } from "../infection-calculators";
import { CropDiseaseContext } from "./crop-disease-context";
import { orchardDiseaseModelDocPath } from "./crop-model-doc";
import { grapeSeasonFactor } from "./grape-season";
import {
  countHoursWhere,
  getJstHourFromRecord,
  isNightHourJst,
  maxConsecutiveHours,
} from "./wet-period-utils";

const TEMP_MIN = 18;
const TEMP_MAX = 25;
const NIGHT_RH = 92;

function isIdealDownyHour(row: import("../../disease/nasa-power").HourlyWeatherRecord): boolean {
  if (!isHourWet(row)) return false;
  const t = row.temperature ?? NaN;
  return t >= TEMP_MIN && t <= TEMP_MAX;
}

/**
 * べと病 P2+ — 適温連続濡れ・夜間高湿・降水（設計メモ準拠）
 */
export function calcGrapeDownyMildew(
  input: DiseaseWeatherInput,
  _ctx?: CropDiseaseContext
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);

  const idealWetHours = countHoursWhere(window, isIdealDownyHour);
  const precipWetHours = countHoursWhere(
    window,
    (row) => isHourWet(row) && (row.precipitation_mm ?? 0) >= 0.1
  );
  const maxIdealStreak = maxConsecutiveHours(window, isIdealDownyHour);
  const nightHumidIdeal = countHoursWhere(window, (row) => {
    const h = getJstHourFromRecord(row);
    if (!isNightHourJst(h)) return false;
    const rh = row.humidity ?? 0;
    const t = row.temperature ?? NaN;
    return rh >= NIGHT_RH && t >= TEMP_MIN && t <= TEMP_MAX && isHourWet(row);
  });

  let score = 8;
  if (idealWetHours >= 8) score = 72;
  else if (idealWetHours >= 4) score = 48;
  else if (idealWetHours >= 2) score = 22;

  if (maxIdealStreak >= 6) score = Math.min(95, score + 12);
  else if (maxIdealStreak >= 4) score = Math.min(95, score + 8);

  if (nightHumidIdeal >= 6) score = Math.min(95, score + 10);
  else if (nightHumidIdeal >= 3) score = Math.min(95, score + 5);

  if (precipWetHours >= 4) score = Math.min(100, score + 8);
  else if (precipWetHours >= 2) score = Math.min(100, score + 4);

  const month = getJstMonth(input.targetDateTime);
  const season = grapeSeasonFactor("grape:downy_mildew", month);
  const percent = Math.min(100, Math.round(score * season));
  const doc = orchardDiseaseModelDocPath("grape:downy_mildew");

  return {
    percent,
    rationale: `ぶどうべと病: 適温濡れ ${idealWetHours}h・連続最大 ${maxIdealStreak}h・夜間高湿 ${nightHumidIdeal}h・降水濡れ ${precipWetHours}h（48h・JST ${month}月 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
