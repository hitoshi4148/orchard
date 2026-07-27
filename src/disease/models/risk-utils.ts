import { HourlyWeatherRecord } from "../nasa-power";

export const DEFAULT_EVALUATION_HOURS = 7 * 24;
export const DEFAULT_RECENT_HOURS = 48;

export function filterHourlyInWindow(
  hourly: HourlyWeatherRecord[],
  targetMs: number,
  evaluationHours = DEFAULT_EVALUATION_HOURS
): HourlyWeatherRecord[] {
  const windowStartMs = targetMs - evaluationHours * 60 * 60 * 1000;
  return hourly.filter((row) => {
    const ms = new Date(row.datetime).getTime();
    return ms >= windowStartMs && ms <= targetMs;
  });
}

export function recencyWeight(
  eventMs: number,
  targetMs: number,
  recentHours = DEFAULT_RECENT_HOURS,
  evaluationHours = DEFAULT_EVALUATION_HOURS
): number {
  const ageHours = (targetMs - eventMs) / (60 * 60 * 1000);
  if (ageHours <= 24) {
    return 1.0;
  }
  if (ageHours <= recentHours) {
    return 0.75;
  }
  if (ageHours <= evaluationHours) {
    return 0.45;
  }
  return 0.2;
}

export function getJstMonth(dateTime: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
    }).format(new Date(dateTime))
  );
}
