/** 褐斑 P2: 降水日に帰属する濡れ 1 時間 */
export interface MarssoninaAttributedWetHour {
  datetime: string;
  attributionPrecipDay: string;
  precipitation_mm: number | null;
  temperature: number | null;
  isPrecipWet: boolean;
}
