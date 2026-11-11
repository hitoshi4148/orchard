import { OrchardCropId } from "./types";

/**
 * 品種ごとの感染リスク係数（1.0 = 基準、小さいほど抵抗性が高い想定）。
 * 文献値の接続前はすべて 1.0。将来パラメータを disease 別に拡張可能。
 */
const VARIETY_FACTOR: Record<OrchardCropId, Record<string, number>> = {
  apple: {
    ふじ: 1.0,
    つがる: 0.92,
    王林: 1.05,
    ジョナゴールド: 1.08,
    その他: 1.0,
  },
  nashi: {
    幸水: 1.0,
    豊水: 0.95,
    新高: 1.02,
    二十世紀: 0.9,
    あきづき: 1.0,
    その他: 1.0,
  },
  grape: {
    シャインマスカット: 1.0,
    巨峰: 1.0,
    ピオーネ: 1.02,
    甲州: 0.95,
    その他: 1.0,
  },
  peach: {
    川中島白桃: 1.0,
    白鳳: 1.0,
    大紅水: 0.95,
    夢みずき: 1.0,
    その他: 1.0,
  },
};

export function getVarietyFactor(
  cropId: OrchardCropId,
  variety: string
): number {
  return VARIETY_FACTOR[cropId]?.[variety] ?? 1.0;
}
