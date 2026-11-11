/**
 * りんご黒星 — 升孢子放出（降水連動・MacHardy 1986 / RIMpro 系）
 *
 * - 成熟升孢子は降雨で鞘子嚢が湿り飛散する。直近降水からの経過で供給率を下げる。
 * - 夜間開始の降雨は翌朝まで飛散が遅れる（MacHardy & Gadoury 1986）。
 */
import { filterHourlyInWindow } from "../disease/models/risk-utils";
import { HourlyWeatherRecord } from "../disease/nasa-power";

export const ASCOSPORE_RELEASE_RAIN_MM = 0.1;
const LOOKBACK_HOURS = 168;

export interface AscosporeRainDischarge {
  releaseFactor: number;
  lastRainStart: string | null;
  hoursSinceRainStart: number | null;
  diurnalFactor: number;
  summary: string;
}

function jstHour(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(new Date(iso))
  );
}

/** MacHardy (1986) — 降雨開始時刻からの飛散効率の目安 */
export function ascosporeDiurnalDischargeFactor(
  rainStartIso: string,
  targetDateTime: string
): number {
  const startH = jstHour(rainStartIso);
  const targetH = jstHour(targetDateTime);
  if (startH >= 18 || startH < 7) {
    if (targetH >= 7 && targetH <= 12) {
      return 1;
    }
    return 0.42;
  }
  if (startH < 13) {
    return 0.98;
  }
  if (startH < 18) {
    return 0.88;
  }
  return 0.42;
}

function isRainHour(row: HourlyWeatherRecord): boolean {
  return (row.precipitation_mm ?? 0) >= ASCOSPORE_RELEASE_RAIN_MM;
}

/** 直近 LOOKBACK 内で最後に始まった降雨（連続濡れ時間の先頭） */
export function findLastRainPeriodStart(
  hourly: HourlyWeatherRecord[],
  targetMs: number
): { startIso: string; startMs: number } | null {
  const windowHourly = filterHourlyInWindow(
    hourly,
    targetMs,
    LOOKBACK_HOURS
  ).sort(
    (a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  let lastStart: { startIso: string; startMs: number } | null = null;
  let inRain = false;

  for (const row of windowHourly) {
    const ms = new Date(row.datetime).getTime();
    if (ms > targetMs) {
      break;
    }
    if (isRainHour(row)) {
      if (!inRain) {
        lastStart = { startIso: row.datetime, startMs: ms };
        inRain = true;
      }
    } else {
      inRain = false;
    }
  }

  return lastStart;
}

function recencyReleaseFactor(hoursSinceRain: number | null): number {
  if (hoursSinceRain == null) {
    return 0.06;
  }
  if (hoursSinceRain <= 2) {
    return 1;
  }
  if (hoursSinceRain <= 12) {
    return 0.93;
  }
  if (hoursSinceRain <= 24) {
    return 0.78;
  }
  if (hoursSinceRain <= 48) {
    return 0.52;
  }
  if (hoursSinceRain <= 96) {
    return 0.28;
  }
  return 0.1;
}

export function computeAscosporeRainDischargeFactor(
  hourly: HourlyWeatherRecord[],
  targetDateTime: string
): AscosporeRainDischarge {
  const targetMs = new Date(targetDateTime).getTime();
  const lastRain = findLastRainPeriodStart(hourly, targetMs);

  if (!lastRain) {
    return {
      releaseFactor: 0.06,
      lastRainStart: null,
      hoursSinceRainStart: null,
      diurnalFactor: 1,
      summary:
        "降水連動放出: 直近7日に有効降雨なし — 升孢子飛散は極めて少ない想定（6%）。",
    };
  }

  const hoursSinceRainStart =
    (targetMs - lastRain.startMs) / (60 * 60 * 1000);
  const diurnalFactor = ascosporeDiurnalDischargeFactor(
    lastRain.startIso,
    targetDateTime
  );
  const recency = recencyReleaseFactor(hoursSinceRainStart);
  const releaseFactor = Math.min(
    1,
    Math.max(0.04, Math.round(recency * diurnalFactor * 100) / 100)
  );

  return {
    releaseFactor,
    lastRainStart: lastRain.startIso,
    hoursSinceRainStart: Math.round(hoursSinceRainStart * 10) / 10,
    diurnalFactor,
    summary: `降水連動放出: 最終降雨 ${hoursSinceRainStart.toFixed(0)}h 前・昼夜係数 ${diurnalFactor.toFixed(2)} → 放出率 ${Math.round(releaseFactor * 100)}%。`,
  };
}
