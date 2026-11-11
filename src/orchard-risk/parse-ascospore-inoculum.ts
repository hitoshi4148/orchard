/** りんご黒星 — 圃場残病葉（升孢子枯渇プール初期量） */

export type ScabInoculumLevel = "low" | "normal" | "high";

export const SCAB_INOCULUM_POOL_PERCENT: Record<ScabInoculumLevel, number> = {
  low: 60,
  normal: 100,
  high: 130,
};

export function parseScabInoculumLevel(
  value: string | null | undefined
): ScabInoculumLevel {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "low" || trimmed === "l") {
    return "low";
  }
  if (trimmed === "high" || trimmed === "h") {
    return "high";
  }
  return "normal";
}

export function scabInoculumInitialPoolPercent(
  level: ScabInoculumLevel
): number {
  return SCAB_INOCULUM_POOL_PERCENT[level];
}

/** 枯渇プール残量を升孢子供給係数 0–1 に正規化 */
export function ascosporePoolSupplyFactor(
  remainingPercent: number,
  initialPoolPercent: number
): number {
  if (initialPoolPercent <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, remainingPercent / initialPoolPercent));
}
