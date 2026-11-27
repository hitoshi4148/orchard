import { jstDateKey, toJst } from "./timezone";

export type SprayStatus = "GREEN" | "YELLOW" | "RED";

/** JST daytime window for portal day-representative spray icon (6:00 inclusive – 18:00 exclusive). */
export const SPRAY_DAY_START_HOUR = 6;
export const SPRAY_DAY_END_HOUR = 18;

export interface SprayStatusTimed {
  time: string;
  status: SprayStatus;
}

/**
 * Aggregate hourly GREEN / YELLOW / RED into one daytime status (plan C).
 * - RED if at least half the daytime hours are RED
 * - GREEN if there are at least 3 GREEN hours
 * - YELLOW if there is at least 1 GREEN (but fewer than 3) or any YELLOW
 * - otherwise RED
 */
export function aggregateDaytimeSprayStatus(
  statuses: SprayStatus[]
): SprayStatus | null {
  if (statuses.length === 0) {
    return null;
  }

  let green = 0;
  let yellow = 0;
  let red = 0;
  for (const status of statuses) {
    if (status === "GREEN") green += 1;
    else if (status === "YELLOW") yellow += 1;
    else red += 1;
  }

  const total = green + yellow + red;
  if (red >= Math.ceil(total / 2)) {
    return "RED";
  }
  if (green >= 3) {
    return "GREEN";
  }
  if (green >= 1 || yellow >= 1) {
    return "YELLOW";
  }
  return "RED";
}

export function buildSprayDayStatuses(
  results: SprayStatusTimed[]
): Record<string, SprayStatus> {
  const byDay = new Map<string, SprayStatus[]>();

  for (const row of results) {
    const jst = toJst(row.time);
    if (jst.hour < SPRAY_DAY_START_HOUR || jst.hour >= SPRAY_DAY_END_HOUR) {
      continue;
    }
    const dateKey = jstDateKey(jst);
    const list = byDay.get(dateKey);
    if (list) {
      list.push(row.status);
    } else {
      byDay.set(dateKey, [row.status]);
    }
  }

  const out: Record<string, SprayStatus> = {};
  for (const [dateKey, statuses] of byDay) {
    const aggregated = aggregateDaytimeSprayStatus(statuses);
    if (aggregated) {
      out[dateKey] = aggregated;
    }
  }
  return out;
}