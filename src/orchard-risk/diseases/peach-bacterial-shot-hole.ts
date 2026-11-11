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
import { countHoursWhere } from "./wet-period-utils";

const TEMP_MIN = 15;
const TEMP_MAX = 26;

/** 細菌性穿孔病 — 飛沫＝強雨時間の代理。風速は MET 予報があれば加算 */
export function calcPeachBacterialShotHole(
  input: DiseaseWeatherInput,
  ctx?: CropDiseaseContext
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);

  const splashHours = countHoursWhere(window, (row) => {
    const t = row.temperature ?? NaN;
    const p = row.precipitation_mm ?? 0;
    return p >= 0.3 && t >= TEMP_MIN && t <= TEMP_MAX;
  });
  const heavySplash = countHoursWhere(
    window,
    (row) => (row.precipitation_mm ?? 0) >= 1.0
  );
  const hasWindData = window.some(
    (row) => row.wind_speed_ms != null && !Number.isNaN(row.wind_speed_ms)
  );
  const windySplash = countHoursWhere(window, (row) => {
    const p = row.precipitation_mm ?? 0;
    const w = row.wind_speed_ms ?? 0;
    const t = row.temperature ?? NaN;
    return p >= 0.3 && w >= 4 && t >= TEMP_MIN && t <= TEMP_MAX;
  });
  const postRainWet = countHoursWhere(window, (row) => {
    if (!isHourWet(row)) return false;
    const t = row.temperature ?? NaN;
    const rh = row.humidity ?? 0;
    return t >= TEMP_MIN && t <= TEMP_MAX && rh >= 88;
  });

  let score = 8;
  if (splashHours >= 4) score = 70;
  else if (splashHours >= 2) score = 48;
  else if (splashHours >= 1) score = 28;

  if (heavySplash >= 2) score = Math.min(95, score + 12);
  else if (heavySplash >= 1) score = Math.min(95, score + 6);
  if (windySplash >= 3) score = Math.min(98, score + 10);
  else if (windySplash >= 1) score = Math.min(98, score + 5);
  if (postRainWet >= 6) score = Math.min(100, score + 6);

  const month = getJstMonth(input.targetDateTime);
  const season = peachSeasonFactor("peach:bacterial_shot_hole", month);
  const percent = Math.min(100, Math.round(score * season));
  const doc = orchardDiseaseModelDocPath("peach:bacterial_shot_hole");

  const windPart = hasWindData
    ? `風速4m/s以上×降水 ${windySplash}h`
    : "風未モデル化";
  return {
    percent,
    rationale: `もも細菌性穿孔病: 飛沫代理（降水 ${splashHours}h・強雨 ${heavySplash}h）・${windPart}・湿潤 ${postRainWet}h（生育 ${ctx?.growthStageId ?? "—"}・JST ${month}月 ×${season.toFixed(2)}）— ${percent}%。設計: ${doc}。`,
  };
}
