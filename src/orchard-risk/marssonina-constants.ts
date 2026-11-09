/**
 * りんご褐斑病 — 猫塚ほか（2023）日植病報 89(4):215–224 で報告された候補値。
 * P2 以降の感染・発病計算で使用（P0/P1 では定義のみ）。
 */
export const MARSSONINA_WET_AVG_TEMP_MIN_C = 13.8;
export const MARSSONINA_WET_DURATION_MIN_H = 6;
export const MARSSONINA_GDD_BASE_C = 4.6;
export const MARSSONINA_GDD_THRESHOLD_DAYC = 159;

/**
 * NASA API 呼び出し時の暦日バッファ（JST 境界の 9h 欠測対策）。
 * 探索範囲そのものの切り捨てには使わない。
 */
export const NASA_HOURLY_API_BUFFER_DAYS = 1;
