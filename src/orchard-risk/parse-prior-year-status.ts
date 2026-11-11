/** もも — 昨年の病害発生状況（越冬・初侵染リスクの簡易係数用） */

export type PriorYearStatus = "light" | "moderate" | "severe";

export function parsePriorYearStatus(
  value: string | null | undefined
): PriorYearStatus | null {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "light" || trimmed === "l") {
    return "light";
  }
  if (trimmed === "moderate" || trimmed === "m") {
    return "moderate";
  }
  if (trimmed === "severe" || trimmed === "s") {
    return "severe";
  }
  return null;
}
