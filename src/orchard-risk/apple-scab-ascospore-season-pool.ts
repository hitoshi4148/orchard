/**
 * りんご黒星 — 升孢子シーズン枯渇プール（降雨別累積放出の簡易トラッキング）
 *
 * RIMpro / MacHardy 系: 成熟升孢子の「残り」を降雨イベントごとに減算。
 * 直近降雨係数（放出効率）と併用 — 本モジュールはシーズン上限側。
 */
import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import { findWetPeriods } from "../disease/wetness";
import {
  AppleScabBiofixSource,
  computeAppleScabAscosporeMaturity,
} from "./apple-scab-ascospore-gdd";
import {
  ASCOSPORE_RELEASE_RAIN_MM,
  ascosporeDiurnalDischargeFactor,
} from "./apple-scab-ascospore-rain-release";

/** 標準圃場の升孢子枯渇プール初期値（%） */
export const ASCOSPORE_SEASON_INITIAL_POOL = 100;

/** MacHardy/RIMpro 系 — 1 降雨イベントあたりの基準放出割合（群馬ゴールデン調整用） */
export const ASCOSPORE_RELEASE_FRACTION_BASE = 0.14;

/** イベント降水量（mm）で放出を補正 — 中央 3mm で係数 1.0 */
export const ASCOSPORE_RELEASE_PRECIP_MM_MID = 3;
export const ASCOSPORE_RELEASE_PRECIP_FACTOR_MAX = 1.35;

/** 成熟升孢子がこれ未満なら降雨放出なし */
export const ASCOSPORE_MATURITY_MIN_FOR_RELEASE = 8;

export interface AscosporePoolSnapshot {
  date: string;
  remainingPercent: number;
  cumulativeReleasedPercent: number;
  rainEventsProcessed: number;
}

/** 75日 hourly 窓より前の日次降雨でプールを繰り越す */
export interface AscosporePoolCarryIn {
  windowStartDate: string;
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

export function ascosporeReleasePrecipFactor(precipMm: number): number {
  if (precipMm <= 0) {
    return 0.85;
  }
  const scaled =
    0.85 + Math.min(precipMm, 14) / (ASCOSPORE_RELEASE_PRECIP_MM_MID * 8);
  return Math.min(ASCOSPORE_RELEASE_PRECIP_FACTOR_MAX, scaled);
}

function releaseFractionForRainPeriod(
  durationHours: number,
  maturityPercent: number,
  diurnal: number,
  eventPrecipMm = 0
): number {
  if (maturityPercent < ASCOSPORE_MATURITY_MIN_FOR_RELEASE) {
    return 0;
  }
  const wetness = Math.min(1.6, durationHours / 6);
  const maturity = Math.min(1, maturityPercent / 100);
  const precip = ascosporeReleasePrecipFactor(eventPrecipMm);
  return (
    ASCOSPORE_RELEASE_FRACTION_BASE * wetness * maturity * diurnal * precip
  );
}

function periodPrecipMm(period: { wetHours: HourlyWeatherRecord[] }): number {
  return period.wetHours.reduce(
    (sum, h) => sum + (h.precipitation_mm ?? 0),
    0
  );
}

/**
 * hourly 窓開始日より前 — 日降水量で 1 日 1 降雨イベント相当として枯渇を進める。
 */
export function computeAscosporePoolCarryInFromDaily(
  biofixDate: string,
  biofixSource: AppleScabBiofixSource,
  measuredDaily: DailyWeatherRecord[],
  throughDate: string,
  initialPoolPercent: number
): Omit<AscosporePoolCarryIn, "windowStartDate"> {
  const dailyMap = new Map(measuredDaily.map((r) => [r.date, r]));
  const poolCap = Math.max(0, initialPoolPercent);
  let remaining = poolCap;
  let cumulativeReleased = 0;
  let eventCount = 0;

  if (throughDate < biofixDate) {
    return {
      remainingPercent: poolCap,
      cumulativeReleasedPercent: 0,
      rainEventsProcessed: 0,
    };
  }

  let d = biofixDate;
  for (;;) {
    const row = dailyMap.get(d);
    const precip = row?.precipitation_mm ?? 0;
    if (precip >= ASCOSPORE_RELEASE_RAIN_MM && remaining > 0) {
      const rainStart = `${d}T14:00:00+09:00`;
      const rainEnd = `${d}T18:00:00+09:00`;
      const maturity = computeAppleScabAscosporeMaturity(
        biofixDate,
        rainEnd,
        measuredDaily,
        [],
        biofixSource
      );
      const diurnal = ascosporeDiurnalDischargeFactor(rainStart, rainEnd);
      const durationHours = Math.min(12, Math.max(4, precip * 3));
      const frac = releaseFractionForRainPeriod(
        durationHours,
        maturity.maturityPercent,
        diurnal,
        precip
      );
      if (frac > 0) {
        const released = remaining * frac;
        remaining = Math.max(0, remaining - released);
        cumulativeReleased = Math.min(poolCap, cumulativeReleased + released);
        eventCount += 1;
      }
    }
    if (d === throughDate) {
      break;
    }
    d = addDaysToDateString(d, 1);
  }

  return {
    remainingPercent: Math.round(remaining * 10) / 10,
    cumulativeReleasedPercent: Math.round(cumulativeReleased * 10) / 10,
    rainEventsProcessed: eventCount,
  };
}

/**
 * バイオフィックス〜履歴＋予報 hourly から日次の残存プールを構築。
 */
export function buildAscosporePoolSnapshots(
  biofixDate: string,
  biofixSource: AppleScabBiofixSource,
  measuredDaily: DailyWeatherRecord[],
  hourly: HourlyWeatherRecord[],
  initialPoolPercent: number = ASCOSPORE_SEASON_INITIAL_POOL,
  carryIn?: AscosporePoolCarryIn
): Map<string, AscosporePoolSnapshot> {
  const windowStart = carryIn?.windowStartDate ?? biofixDate;
  const poolCap = Math.max(0, initialPoolPercent);
  let remaining = carryIn?.remainingPercent ?? poolCap;
  let cumulativeReleased = carryIn?.cumulativeReleasedPercent ?? 0;
  let eventCount = carryIn?.rainEventsProcessed ?? 0;

  const sorted = [...hourly].sort(
    (a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  const inSeason = sorted.filter((h) => jstYmd(h.datetime) >= windowStart);
  if (inSeason.length === 0) {
    if (!carryIn) {
      return new Map();
    }
    const snapshots = new Map<string, AscosporePoolSnapshot>();
    snapshots.set(windowStart, {
      date: windowStart,
      remainingPercent: Math.round(remaining * 10) / 10,
      cumulativeReleasedPercent:
        Math.round(cumulativeReleased * 10) / 10,
      rainEventsProcessed: eventCount,
    });
    return snapshots;
  }

  const periods = findWetPeriods(inSeason).filter(periodHasRain);

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

  let lastSnapYmd = windowStart;
  recordSnapshot(windowStart);

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
      diurnal,
      periodPrecipMm(period)
    );
    if (frac > 0 && remaining > 0) {
      const released = remaining * frac;
      remaining = Math.max(0, remaining - released);
      cumulativeReleased = Math.min(poolCap, cumulativeReleased + released);
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

/** 升孢子期外など — フル hourly 再生を避けた枯渇済みプール（Worker CPU 対策） */
export function depletedAscosporePoolMap(
  ymd: string,
  initialPoolPercent: number
): Map<string, AscosporePoolSnapshot> {
  const remaining = Math.max(
    4,
    Math.min(initialPoolPercent, Math.round(initialPoolPercent * 0.08 * 10) / 10)
  );
  const cumulative = Math.min(
    initialPoolPercent,
    Math.round((initialPoolPercent - remaining) * 10) / 10
  );
  return new Map([
    [
      ymd,
      {
        date: ymd,
        remainingPercent: remaining,
        cumulativeReleasedPercent: cumulative,
        rainEventsProcessed: 0,
      },
    ],
  ]);
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
