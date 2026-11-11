/**
 * Phase 3 — 文献・要覧ベースの潜伏期／GDD パラメータ（ぶどう・もも中心）
 * 数値は警戒用の目安。圃場・品種で変動します。
 */
export type CropOnsetMethod = "latency_days" | "latency_or_gdd";

export interface CropOnsetCatalogEntry {
  diseaseId: string;
  method: CropOnsetMethod;
  /** 感染推定日からの潜伏期（日） */
  latencyDaysMin: number;
  latencyDaysMax: number;
  gddBaseC?: number;
  gddThresholdDayC?: number;
  /** 二次文献・ extension レビュー等 */
  reference: string;
}

export const CROP_ONSET_CATALOG: Record<string, CropOnsetCatalogEntry> = {
  "grape:downy_mildew": {
    diseaseId: "grape:downy_mildew",
    method: "latency_or_gdd",
    latencyDaysMin: 7,
    latencyDaysMax: 12,
    gddBaseC: 5,
    gddThresholdDayC: 60,
    reference:
      "Plasmopara viticola — 適温下 約7–12日で症状（要覧・病害図鑑の目安）。積算は簡易代理（基準5℃・60日℃）。",
  },
  "grape:black_rot": {
    diseaseId: "grape:black_rot",
    method: "latency_days",
    latencyDaysMin: 10,
    latencyDaysMax: 14,
    reference:
      "Guignardia bidwellii — 若組織感染後 約10–14日で病斑（文献目安の幅）。",
  },
  "grape:late_rot": {
    diseaseId: "grape:late_rot",
    method: "latency_days",
    latencyDaysMin: 14,
    latencyDaysMax: 28,
    reference:
      "Greeneria 系晩腐 — 果粒感染と症状のタイムラグが長い（約2–4週）。感染危険とは別に解釈。",
  },
  "grape:gray_mold": {
    diseaseId: "grape:gray_mold",
    method: "latency_or_gdd",
    latencyDaysMin: 5,
    latencyDaysMax: 10,
    gddBaseC: 0,
    gddThresholdDayC: 40,
    reference:
      "Botrytis cinerea — 花房感染後 涼冷湿下で約5–10日（開花期警戒）。簡易 GDD 40日℃（0℃基準）。",
  },
  "grape:anthracnose": {
    diseaseId: "grape:anthracnose",
    method: "latency_days",
    latencyDaysMin: 10,
    latencyDaysMax: 16,
    reference: "Elsinoe ampelina — 高温多湿期の感染後 約10–16日で斑出現（目安）。",
  },
  "peach:bacterial_shot_hole": {
    diseaseId: "peach:bacterial_shot_hole",
    method: "latency_days",
    latencyDaysMin: 7,
    latencyDaysMax: 14,
    reference:
      "Xanthomonas arboricola pv. pruni — 感染後 約1–2週で穿孔様症状（拡張資料の目安）。",
  },
  "peach:gray_spot": {
    diseaseId: "peach:gray_spot",
    method: "latency_days",
    latencyDaysMin: 10,
    latencyDaysMax: 18,
    reference: "灰色炭疽様斑 — 梅雨〜夏の感染後 約10–18日（文献レンジの保守的目安）。",
  },
  "peach:scab": {
    diseaseId: "peach:scab",
    method: "latency_days",
    latencyDaysMin: 10,
    latencyDaysMax: 14,
    reference:
      "Cladosporium carpophilum — もも黒星。感染後 約10–14日で斑点（りんご黒星の簡易 analogy）。",
  },
  "peach:leaf_curl": {
    diseaseId: "peach:leaf_curl",
    method: "latency_or_gdd",
    latencyDaysMin: 14,
    latencyDaysMax: 21,
    gddBaseC: 0,
    gddThresholdDayC: 120,
    reference:
      "Taphrina deformans（ももいさか病）— 萌芽〜展葉前の低温濡れ感染後 約2–3週。簡易 GDD 120日℃（0℃基準）。",
  },
  "peach:anthracnose": {
    diseaseId: "peach:anthracnose",
    method: "latency_days",
    latencyDaysMin: 7,
    latencyDaysMax: 14,
    reference: "もも炭疽 — 暖湿期感染後 約7–14日（目安）。",
  },
};

export function getCropOnsetCatalogEntry(
  diseaseId: string
): CropOnsetCatalogEntry | null {
  return CROP_ONSET_CATALOG[diseaseId] ?? null;
}

export function listCropOnsetCatalogIds(): string[] {
  return Object.keys(CROP_ONSET_CATALOG).sort();
}
