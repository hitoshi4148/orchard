/** 検証レポート用の代表地点・褐斑ゴールデン期待値（Phase2 B2 本番整合） */

export interface ValidationSite {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export const VALIDATION_SITES: ValidationSite[] = [
  { id: "hirosaki", label: "弘前", lat: 40.82, lon: 140.74 },
  { id: "default", label: "標準UI座標", lat: 36.39, lon: 139.06 },
];

/** 固定暦日比較（統合テスト・B2 監査と同じ窓） */
export const MARSSONINA_GOLDEN_WINDOW = {
  bloomStart: "2026-04-25",
  explorationEnd: "2026-11-08",
  evaluateThrough: "2026-11-09",
} as const;

export const MARSSONINA_GOLDEN_EXPECTATIONS: Record<
  string,
  { primaryInfectionDate: string; gdd159OnsetDate: string }
> = {
  hirosaki: {
    primaryInfectionDate: "2026-05-24",
    gdd159OnsetDate: "2026-06-07",
  },
  default: {
    primaryInfectionDate: "2026-05-21",
    gdd159OnsetDate: "2026-06-05",
  },
};
