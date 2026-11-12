/**
 * りんご黒星 — 二次感染（分生胞子）簡易チャネル
 *
 * 既存病斑からの分生胞子は生育ステージが進むほど供給が増えるとみなし、
 * Mills 気象素点に × 供給率を適用。子囊孢子経路と max を取る。
 */

const CONIDIAL_SUPPLY_PERCENT: Record<string, number> = {
  bud: 0,
  bloom: 0,
  petalfall: 18,
  youngfruit: 55,
  fruitgrowth: 88,
  harvest: 45,
};

export function conidialSupplyPercentForStage(growthStageId: string): number {
  return CONIDIAL_SUPPLY_PERCENT[growthStageId] ?? 0;
}

export interface AppleScabConidialRisk {
  supplyPercent: number;
  percent: number;
  summary: string;
}

/** Mills 素点 × 分生胞子供給率（生育ステージベース） */
export function computeAppleScabConidialRisk(
  millsPercent: number,
  growthStageId: string
): AppleScabConidialRisk {
  const supplyPercent = conidialSupplyPercentForStage(growthStageId);
  if (supplyPercent <= 0 || millsPercent <= 0) {
    return {
      supplyPercent,
      percent: 0,
      summary:
        supplyPercent <= 0
          ? "分生胞子供給は未成立（生育ステージが早い）。"
          : "分生胞子チャネル: Mills 素点が低い。",
    };
  }
  const percent = Math.min(
    100,
    Math.max(0, Math.round((millsPercent * supplyPercent) / 100))
  );
  return {
    supplyPercent,
    percent,
    summary: `分生胞子チャネル: Mills ${millsPercent}% × 供給 ${supplyPercent}% → ${percent}%（生育 ${growthStageId}）。`,
  };
}

/** 子囊孢子放出末期 — 残存成熟率の減衰（GDD 600 日℃付近） */
export function ascosporeReleaseFactorAfterDepletion(gddDayC: number): number {
  if (gddDayC < 520) {
    return 1;
  }
  if (gddDayC >= 620) {
    return 0.12;
  }
  const t = (gddDayC - 520) / 100;
  return 1 - t * 0.88;
}
