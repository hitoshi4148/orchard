import { bumpInfectionLevel } from "./risk-level";
import type { PriorYearStatus } from "./parse-prior-year-status";
import type { RiskLevel } from "./types";

/** 昨年発生が感染危険へ効くもも病害（越冬葉・初侵染の簡易代理） */
export const PRIOR_YEAR_AFFECTED_PEACH_DISEASES = new Set([
  "peach:gray_spot",
  "peach:scab",
]);

export function adjustLevelForPriorYear(
  level: RiskLevel,
  status: PriorYearStatus | null,
  diseaseId: string
): RiskLevel {
  if (!status || !PRIOR_YEAR_AFFECTED_PEACH_DISEASES.has(diseaseId)) {
    return level;
  }
  if (status === "severe") {
    return bumpInfectionLevel(level, 1);
  }
  if (status === "moderate") {
    return level === "low" ? "caution" : level;
  }
  return level;
}

export function priorYearRationaleSuffix(
  status: PriorYearStatus | null,
  diseaseId: string
): string {
  if (!status || !PRIOR_YEAR_AFFECTED_PEACH_DISEASES.has(diseaseId)) {
    return "";
  }
  if (status === "severe") {
    return " 昨年発生重いため感染危険を1段階上方修正（灰星・黒星・簡易係数）。";
  }
  if (status === "moderate") {
    return " 昨年発生中程度のため低→中に上方修正（灰星・黒星・簡易係数）。";
  }
  return "";
}

export function priorYearSummaryLabel(status: PriorYearStatus | null): string | null {
  if (!status) return null;
  if (status === "severe") {
    return "昨年重いため灰星・黒星の係数↑";
  }
  if (status === "moderate") {
    return "昨年中程度のため灰星・黒星（低→中）係数↑";
  }
  return null;
}
