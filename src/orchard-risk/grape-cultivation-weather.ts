import { DiseaseWeatherInput } from "../disease/types";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import type { GrapeCultivationId } from "./parse-grape-cultivation";

/** 雨よけハウス — 降水・冠上高湿の簡易減衰（防除・切削は未モデル化） */
export const RAIN_SHELTER_PRECIP_FACTOR = 0.4;
export const RAIN_SHELTER_HUMIDITY_FACTOR = 0.92;
export const RAIN_SHELTER_HUMIDITY_CAP = 88;

function adjustHour(
  row: HourlyWeatherRecord,
  cultivationId: GrapeCultivationId
): HourlyWeatherRecord {
  if (cultivationId !== "rain_shelter") {
    return row;
  }
  const precip =
    row.precipitation_mm != null
      ? Math.round(row.precipitation_mm * RAIN_SHELTER_PRECIP_FACTOR * 100) / 100
      : row.precipitation_mm;
  let humidity = row.humidity;
  if (humidity != null && !Number.isNaN(humidity)) {
    humidity = Math.min(
      RAIN_SHELTER_HUMIDITY_CAP,
      Math.round(humidity * RAIN_SHELTER_HUMIDITY_FACTOR)
    );
  }
  return { ...row, precipitation_mm: precip, humidity };
}

export function adjustWeatherForGrapeCultivation(
  input: DiseaseWeatherInput,
  cultivationId: GrapeCultivationId
): DiseaseWeatherInput {
  if (cultivationId !== "rain_shelter") {
    return input;
  }
  return {
    ...input,
    hourly: input.hourly.map((row) => adjustHour(row, cultivationId)),
  };
}

export function grapeCultivationRationaleSuffix(
  cultivationId: GrapeCultivationId | null | undefined
): string {
  if (cultivationId !== "rain_shelter") {
    return "";
  }
  return ` 雨よけ栽培のため降水×${RAIN_SHELTER_PRECIP_FACTOR}・湿度簡易減衰を適用（感染気象のみ・6日表は生予報）。`;
}

export function grapeCultivationSummaryLabel(
  cultivationId: GrapeCultivationId | null | undefined
): string | null {
  if (cultivationId !== "rain_shelter") {
    return null;
  }
  return "雨よけ栽培 — 感染計算で降水・高湿を簡易減衰";
}
