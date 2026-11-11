import { OrchardCropId } from "./types";

/**
 * 品種ごとの基準感受性係数（1.0 = 標準）。小さいほど抵抗性が高い想定。
 * 病害別の上書きは DISEASE_VARIETY_FACTOR を参照。
 */
const CROP_VARIETY_FACTOR: Record<OrchardCropId, Record<string, number>> = {
  apple: {
    ふじ: 1.0,
    ぐんま名月: 0.95,
    あかぎ: 0.98,
    陽光: 1.02,
    おぜの紅: 1.0,
    紅鶴: 1.0,
    スリムレッド: 0.96,
    つがる: 0.9,
    王林: 1.05,
    未指定: 1.0,
    ジョナゴールド: 1.1,
    その他: 1.0,
  },
  nashi: {
    幸水: 1.0,
    豊水: 0.95,
    あきづき: 1.0,
    新高: 1.02,
    群馬N2号: 1.0,
    二十世紀: 0.88,
    未指定: 1.0,
    その他: 1.0,
  },
  grape: {
    シャインマスカット: 0.95,
    巨峰: 1.05,
    ピオーネ: 1.03,
    デラウェア: 1.0,
    甲州: 0.9,
    その他: 1.0,
  },
  peach: {
    あかつき: 1.0,
    川中島白桃: 1.0,
    白鳳: 0.98,
    黄金桃: 1.02,
    なつっこ: 1.0,
    大紅水: 0.95,
    夢みずき: 1.0,
    その他: 1.0,
  },
};

/** 病害×品種（試験場・要覧ベースの目安。未記載は作物基準を使用） */
const DISEASE_VARIETY_FACTOR: Record<string, Record<string, number>> = {
  "apple:scab": {
    ふじ: 1.0,
    つがる: 0.88,
    ジョナゴールド: 1.12,
    王林: 1.06,
    ぐんま名月: 0.94,
    二十世紀: 1.0,
  },
  "apple:marssonina": {
    ふじ: 1.0,
    つがる: 1.08,
    王林: 1.04,
    ぐんま名月: 0.96,
  },
  "apple:alternaria": {
    ふじ: 1.0,
    ジョナゴールド: 1.1,
    つがる: 0.92,
  },
  "apple:blotch": {
    ふじ: 1.05,
    つがる: 0.9,
    王林: 1.08,
  },
  "apple:anthracnose": {
    ふじ: 1.0,
    つがる: 0.94,
    陽光: 1.05,
  },
  "nashi:scab": {
    幸水: 1.0,
    二十世紀: 0.9,
    豊水: 0.96,
  },
  "nashi:red_spot": {
    幸水: 1.0,
    新高: 1.04,
  },
  "nashi:blotch": {
    幸水: 1.0,
    あきづき: 1.03,
  },
  "grape:downy_mildew": {
    巨峰: 1.1,
    甲州: 0.85,
    シャインマスカット: 0.92,
    ピオーネ: 1.05,
  },
  "grape:black_rot": {
    巨峰: 1.08,
    デラウェア: 1.05,
    甲州: 0.95,
  },
  "grape:gray_mold": {
    ピオーネ: 1.06,
    シャインマスカット: 0.94,
  },
  "peach:scab": {
    川中島白桃: 1.0,
    白鳳: 0.94,
    あかつき: 1.02,
  },
  "peach:leaf_curl": {
    白鳳: 0.92,
    川中島白桃: 1.0,
  },
  "peach:bacterial_shot_hole": {
    川中島白桃: 1.0,
    黄金桃: 1.05,
  },
};

export function getCropVarietyFactor(
  cropId: OrchardCropId,
  variety: string
): number {
  return CROP_VARIETY_FACTOR[cropId]?.[variety] ?? 1.0;
}

export function getDiseaseVarietyFactor(
  cropId: OrchardCropId,
  variety: string,
  diseaseId: string
): number {
  const diseaseSpecific = DISEASE_VARIETY_FACTOR[diseaseId]?.[variety];
  if (diseaseSpecific != null) {
    return diseaseSpecific;
  }
  return getCropVarietyFactor(cropId, variety);
}

/** @deprecated 表示用の代表係数（黒星・基準品種） */
export function getVarietyFactor(
  cropId: OrchardCropId,
  variety: string
): number {
  return getCropVarietyFactor(cropId, variety);
}
