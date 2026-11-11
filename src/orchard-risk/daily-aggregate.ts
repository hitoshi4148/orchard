import { isHourWet } from "../disease/wetness";
import { HourlyWeatherRecord } from "../disease/nasa-power";
import { addDaysToDateString, jstTodayString } from "../disease/met-norway-forecast";
import { OrchardDailyWeather } from "./types";
import { windFromDegToCompass } from "./wind-utils";

function dayLabel(offset: number): string {
  if (offset === 0) {
    return "本日";
  }
  return `${offset}日先`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function hoursForDate(
  hourly: HourlyWeatherRecord[],
  date: string
): HourlyWeatherRecord[] {
  return hourly.filter((row) => row.datetime.startsWith(date));
}

export function buildSixDayWeather(
  hourly: HourlyWeatherRecord[]
): OrchardDailyWeather[] {
  const today = jstTodayString();
  const days: OrchardDailyWeather[] = [];

  for (let offset = 0; offset <= 5; offset += 1) {
    const date = addDaysToDateString(today, offset);
    const rows = hoursForDate(hourly, date);
    const temps = rows
      .map((r) => r.temperature)
      .filter((v): v is number => v != null && !Number.isNaN(v));
    const humids = rows
      .map((r) => r.humidity)
      .filter((v): v is number => v != null && !Number.isNaN(v));
    const precips = rows.map((r) => r.precipitation_mm ?? 0);
    const wetHours = rows.filter((r) => isHourWet(r)).length;
    let maxWindMs: number | null = null;
    let maxWindCompass: string | null = null;
    for (const row of rows) {
      const w = row.wind_speed_ms;
      if (w == null || Number.isNaN(w)) continue;
      if (maxWindMs == null || w > maxWindMs) {
        maxWindMs = w;
        maxWindCompass = windFromDegToCompass(row.wind_from_deg);
      }
    }

    days.push({
      dayOffset: offset,
      label: dayLabel(offset),
      date,
      avgTemp: temps.length ? Math.round(average(temps) * 10) / 10 : 0,
      maxTemp: temps.length ? Math.max(...temps) : 0,
      minTemp: temps.length ? Math.min(...temps) : 0,
      precipMm: Math.round(precips.reduce((s, v) => s + v, 0) * 10) / 10,
      humidityPct: humids.length ? Math.round(average(humids)) : 0,
      leafWetHours: wetHours,
      leafWetIsEstimated: true,
      maxWindMs: maxWindMs != null ? Math.round(maxWindMs * 10) / 10 : null,
      maxWindCompass,
    });
  }

  return days;
}
