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
