/** 検証レポート用の代表地点・褐斑ゴールデン期待値（Phase2 B2 本番整合） */

import { GUNMA_VALIDATION_SITES } from "./gunma-reference";

export interface ValidationSite {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export const VALIDATION_SITES: ValidationSite[] = [
  { id: "hirosaki", label: "弘前（北部参照）", lat: 40.82, lon: 140.74 },
  ...GUNMA_VALIDATION_SITES.map((s) => ({
    id: s.id,
    label: s.label,
    lat: s.lat,
    lon: s.lon,
  })),
];

/** 群馬向け開花始期ゴールデン（前橋・高崎など代表地点共通） */
export const MARSSONINA_GOLDEN_WINDOW = {
  bloomStart: "2026-04-22",
  explorationEnd: "2026-11-08",
  evaluateThrough: "2026-11-09",
} as const;

const GUNMA_MARSSONINA_GOLDEN = {
  primaryInfectionDate: "2026-05-21",
  gdd159OnsetDate: "2026-06-05",
};

export const MARSSONINA_GOLDEN_EXPECTATIONS: Record<
  string,
  { primaryInfectionDate: string; gdd159OnsetDate: string }
> = {
  hirosaki: {
    primaryInfectionDate: "2026-05-24",
    gdd159OnsetDate: "2026-06-07",
  },
  maebashi: GUNMA_MARSSONINA_GOLDEN,
  takasaki: GUNMA_MARSSONINA_GOLDEN,
  shibukawa: GUNMA_MARSSONINA_GOLDEN,
  numata: GUNMA_MARSSONINA_GOLDEN,
  /** @deprecated 互換: 旧 id default → maebashi */
  default: GUNMA_MARSSONINA_GOLDEN,
};

/** りんご黒星・升孢子枯渇プール（NASA 固定窓・緑期 3/25） */
export const APPLE_SCAB_POOL_GOLDEN_WINDOW = {
  greenTip: "2026-03-25",
  seasonEnd: "2026-06-30",
} as const;

export interface AppleScabPoolGoldenCheckpoint {
  queryDate: string;
  /** スナップショット日（降雨イベント日のみ更新のため query と異なることがある） */
  snapDate?: string;
  remainingPercent: number;
  cumulativeReleasedPercent: number;
  rainEventsProcessed: number;
}

const GUNMA_APPLE_SCAB_POOL_GOLDEN: AppleScabPoolGoldenCheckpoint[] = [
  {
    queryDate: "2026-05-15",
    remainingPercent: 44.2,
    cumulativeReleasedPercent: 55.8,
    rainEventsProcessed: 12,
  },
  {
    queryDate: "2026-06-15",
    snapDate: "2026-06-13",
    remainingPercent: 16.4,
    cumulativeReleasedPercent: 83.6,
    rainEventsProcessed: 22,
  },
  {
    queryDate: "2026-06-30",
    remainingPercent: 8.2,
    cumulativeReleasedPercent: 91.8,
    rainEventsProcessed: 29,
  },
];

export const APPLE_SCAB_POOL_GOLDEN_EXPECTATIONS: Record<
  string,
  AppleScabPoolGoldenCheckpoint[]
> = {
  maebashi: GUNMA_APPLE_SCAB_POOL_GOLDEN,
  takasaki: GUNMA_APPLE_SCAB_POOL_GOLDEN,
  shibukawa: GUNMA_APPLE_SCAB_POOL_GOLDEN,
  numata: GUNMA_APPLE_SCAB_POOL_GOLDEN,
};
