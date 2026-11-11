import { RiskLevel } from "./types";

/** 0–100 のリスクを 3 段階に変換（感染危険度） */
export function percentToInfectionLevel(
  percent: number | null
): RiskLevel | null {
  if (percent == null || Number.isNaN(percent)) {
    return null;
  }
  if (percent < 35) {
    return "low";
  }
  if (percent < 65) {
    return "caution";
  }
  return "high";
}

export function applyVarietyFactor(
  percent: number | null,
  factor: number
): number | null {
  if (percent == null || Number.isNaN(percent)) {
    return null;
  }
  const clampedFactor = Math.min(1.5, Math.max(0.5, factor));
  return Math.min(100, Math.max(0, Math.round(percent * clampedFactor)));
}

const INFECTION_LEVEL_ORDER: RiskLevel[] = ["low", "caution", "high"];

/** 感染危険を n 段階上げる（high は据え置き） */
export function bumpInfectionLevel(level: RiskLevel, steps: number): RiskLevel {
  const idx = INFECTION_LEVEL_ORDER.indexOf(level);
  if (idx < 0) return level;
  return INFECTION_LEVEL_ORDER[
    Math.min(INFECTION_LEVEL_ORDER.length - 1, idx + Math.max(0, steps))
  ];
}
