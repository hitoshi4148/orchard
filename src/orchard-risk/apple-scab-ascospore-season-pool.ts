/**
 * りんご黒星 — 升孢子シーズン枯渇プール（降雨別累積放出の簡易トラッキング）
 *
 * RIMpro / MacHardy 系: 成熟升孢子の「残り」を降雨イベントごとに減算。
 * 直近降雨係数（放出効率）と併用 — 本モジュールはシーズン上限側。
 */
import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { findWetPeriods } from "../disease/wetness";
import {
  AppleScabBiofixSource,
  computeAppleScabAscosporeMaturity,
} from "./apple-scab-ascospore-gdd";
import {
  ASCOSPORE_RELEASE_RAIN_MM,
  ascosporeDiurnalDischargeFactor,
} from "./apple-scab-ascospore-rain-release";

export const ASCOSPORE_SEASON_INITIAL_POOL = 100;

export interface AscosporePoolSnapshot {
  date: string;
  remainingPercent: number;
  cumulativeReleasedPercent: number;
  rainEventsProcessed: number;
}

function jstYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function periodHasRain(period: {
  wetHours: HourlyWeatherRecord[];
}): boolean {
  return period.wetHours.some(
    (h) => (h.precipitation_mm ?? 0) >= ASCOSPORE_RELEASE_RAIN_MM
  );
}

function releaseFractionForRainPeriod(
  durationHours: number,
  maturityPercent: number,
  diurnal: number
): number {
  if (maturityPercent < 8) {
    return 0;
  }
  const wetness = Math.min(1.6, durationHours / 6);
  const maturity = Math.min(1, maturityPercent / 100);
  return 0.14 * wetness * maturity * diurnal;
}

/**
 * バイオフィックス〜履歴＋予報 hourly から日次の残存プールを構築。
 */
export function buildAscosporePoolSnapshots(
  biofixDate: string,
  biofixSource: AppleScabBiofixSource,
  measuredDaily: DailyWeatherRecord[],
  hourly: HourlyWeatherRecord[]
): Map<string, AscosporePoolSnapshot> {
  const sorted = [...hourly].sort(
    (a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  const inSeason = sorted.filter((h) => jstYmd(h.datetime) >= biofixDate);
  if (inSeason.length === 0) {
    return new Map();
  }

  const periods = findWetPeriods(inSeason).filter(periodHasRain);
  let remaining = ASCOSPORE_SEASON_INITIAL_POOL;
  let cumulativeReleased = 0;
  let eventCount = 0;

  const snapshots = new Map<string, AscosporePoolSnapshot>();

  const recordSnapshot = (ymd: string) => {
    snapshots.set(ymd, {
      date: ymd,
      remainingPercent: Math.round(remaining * 10) / 10,
      cumulativeReleasedPercent:
        Math.round(cumulativeReleased * 10) / 10,
      rainEventsProcessed: eventCount,
    });
  };

  let lastSnapYmd = biofixDate;
  recordSnapshot(biofixDate);

  for (const period of periods) {
    const endIso = period.endDateTime;
    const ymd = jstYmd(endIso);
    if (ymd < biofixDate) {
      continue;
    }

    const maturity = computeAppleScabAscosporeMaturity(
      biofixDate,
      endIso,
      measuredDaily,
      period.wetHours,
      biofixSource
    );
    const diurnal = ascosporeDiurnalDischargeFactor(
      period.startDateTime,
      endIso
    );
    const frac = releaseFractionForRainPeriod(
      period.durationHours,
      maturity.maturityPercent,
      diurnal
    );
    if (frac > 0 && remaining > 0) {
      const released = remaining * frac;
      remaining = Math.max(0, remaining - released);
      cumulativeReleased = Math.min(
        ASCOSPORE_SEASON_INITIAL_POOL,
        cumulativeReleased + released
      );
      eventCount += 1;
    }

    if (ymd !== lastSnapYmd) {
      recordSnapshot(ymd);
      lastSnapYmd = ymd;
    } else {
      recordSnapshot(ymd);
    }
  }

  const lastYmd = jstYmd(inSeason[inSeason.length - 1].datetime);
  if (!snapshots.has(lastYmd)) {
    recordSnapshot(lastYmd);
  }

  return snapshots;
}

export function ascosporePoolAtDate(
  snapshots: Map<string, AscosporePoolSnapshot> | null | undefined,
  targetDateTime: string
): AscosporePoolSnapshot | null {
  if (!snapshots?.size) {
    return null;
  }
  const targetYmd = jstYmd(targetDateTime);
  if (snapshots.has(targetYmd)) {
    return snapshots.get(targetYmd)!;
  }
  let best: AscosporePoolSnapshot | null = null;
  for (const snap of snapshots.values()) {
    if (snap.date <= targetYmd) {
      if (!best || snap.date > best.date) {
        best = snap;
      }
    }
  }
  return best;
}

export function formatAscosporePoolSummary(
  snap: AscosporePoolSnapshot | null
): string {
  if (!snap) {
    return "";
  }
  if (snap.remainingPercent <= 12) {
    return `升孢子枯渇プール: 残 ${snap.remainingPercent}%（累積放出 ${snap.cumulativeReleasedPercent}%・降雨${snap.rainEventsProcessed}回）— 一次季節末期想定。`;
  }
  return `升孢子枯渇プール: 残 ${snap.remainingPercent}%（累積放出 ${snap.cumulativeReleasedPercent}%・降雨${snap.rainEventsProcessed}回）。`;
}
