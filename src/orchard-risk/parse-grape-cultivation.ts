/** ぶどう — 栽培方式（感染気象の簡易補正） */

export type GrapeCultivationId = "open" | "rain_shelter";

export function parseGrapeCultivationId(
  value: string | null | undefined
): GrapeCultivationId {
  const trimmed = value?.trim().toLowerCase();
  if (trimmed === "rain_shelter" || trimmed === "rain-shelter" || trimmed === "shelter") {
    return "rain_shelter";
  }
  return "open";
}
