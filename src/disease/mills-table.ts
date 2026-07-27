/**
 * Mills 法（改訂版）— 黒星病（Venturia inaequalis）の感染に必要な
 * 最低連続葉面濡れ時間（時間）を気温から求める。
 *
 * 文献: MacHardy (1996), Agrios, RIMpro 採用表に準拠
 */
const MILLS_TABLE: Array<{ tempC: number; hours: number }> = [
  { tempC: 5, hours: 48 },
  { tempC: 6, hours: 40 },
  { tempC: 7, hours: 35 },
  { tempC: 8, hours: 30 },
  { tempC: 9, hours: 26 },
  { tempC: 10, hours: 22 },
  { tempC: 11, hours: 19 },
  { tempC: 12, hours: 17 },
  { tempC: 13, hours: 15 },
  { tempC: 14, hours: 13 },
  { tempC: 15, hours: 12 },
  { tempC: 16, hours: 11 },
  { tempC: 17, hours: 10 },
  { tempC: 18, hours: 9 },
  { tempC: 19, hours: 8 },
  { tempC: 20, hours: 7 },
  { tempC: 21, hours: 6 },
  { tempC: 32, hours: 6 },
];

export const MILLS_TEMP_MIN = 5;
export const MILLS_TEMP_MAX = 32;

/**
 * 濡れ期間中の平均気温から Mills 感染に必要な最低濡れ時間（時間）を返す。
 * 範囲外の気温では null（感染不可）。
 */
export function millsRequiredWetnessHours(averageTempC: number): number | null {
  if (averageTempC < MILLS_TEMP_MIN || averageTempC > MILLS_TEMP_MAX) {
    return null;
  }

  if (averageTempC >= 21) {
    return 6;
  }

  for (let i = 0; i < MILLS_TABLE.length - 1; i++) {
    const lower = MILLS_TABLE[i];
    const upper = MILLS_TABLE[i + 1];
    if (averageTempC >= lower.tempC && averageTempC <= upper.tempC) {
      const ratio =
        (averageTempC - lower.tempC) / (upper.tempC - lower.tempC);
      return lower.hours + ratio * (upper.hours - lower.hours);
    }
  }

  return null;
}
