/** 風向（度）を 8 方位ラベルに */
export function windFromDegToCompass(deg: number | null | undefined): string | null {
  if (deg == null || Number.isNaN(deg)) {
    return null;
  }
  const normalized = ((deg % 360) + 360) % 360;
  const labels = ["北", "北東", "東", "南東", "南", "南西", "西", "北西"];
  const idx = Math.round(normalized / 45) % 8;
  return labels[idx];
}
