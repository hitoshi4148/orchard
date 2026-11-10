/**
 * りんご褐斑病 — 猫塚ほか（2023）日植病報 89(4):215–224（DOI: 10.3186/jjphytopath.89.215）
 * P2: 濡れ持続・平均気温閾値。P3: 有効積算 159日℃（T0=4.6℃）、起算＝一次感染開始日（当日含む）。
 */
export const MARSSONINA_WET_AVG_TEMP_MIN_C = 13.8;
export const MARSSONINA_WET_DURATION_MIN_H = 6;
/** 褐斑 P2c+ Phase 1: 時別降水量がこの値以上の時間を濡れとする（mm/h） */
export const MARSSONINA_PRECIP_WET_MM_H = 0.5;

/**
 * P2c+ Phase 2（長野モデル/鈴木 2003 系・二次文献経由）:
 * 千葉県農林総合研究センター研究報告 2015(7) が述べる「降雨終了後 2 h」
 */
export const MARSSONINA_SUZUKI_POST_RAIN_WET_H = 2;
/** JST 20 時以降の降雨で翌朝まで濡れとみなす（開始時刻・包含） */
export const MARSSONINA_SUZUKI_EVENING_RAIN_START_H = 20;
/** 翌朝濡れ終了（この時刻は濡れに含めない＝7 時は乾燥） */
export const MARSSONINA_SUZUKI_MORNING_WET_END_H = 7;
export const MARSSONINA_GDD_BASE_C = 4.6;
export const MARSSONINA_GDD_THRESHOLD_DAYC = 159;

/**
 * NASA API 呼び出し時の暦日バッファ（JST 境界の 9h 欠測対策）。
 * 探索範囲そのものの切り捨てには使わない。
 */
export const NASA_HOURLY_API_BUFFER_DAYS = 1;
