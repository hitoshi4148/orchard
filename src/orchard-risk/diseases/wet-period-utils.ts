import { HourlyWeatherRecord } from "../../disease/nasa-power";

export function getJstHourFromRecord(row: HourlyWeatherRecord): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(row.datetime));
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  return Number(h);
}

export function maxConsecutiveHours(
  rows: HourlyWeatherRecord[],
  predicate: (row: HourlyWeatherRecord) => boolean
): number {
  let best = 0;
  let streak = 0;
  for (const row of rows) {
    if (predicate(row)) {
      streak += 1;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }
  return best;
}

export function countHoursWhere(
  rows: HourlyWeatherRecord[],
  predicate: (row: HourlyWeatherRecord) => boolean
): number {
  return rows.filter(predicate).length;
}

/** JST 18–06 を夜間帯とする簡易定義 */
export function isNightHourJst(hour: number): boolean {
  return hour >= 18 || hour <= 6;
}
