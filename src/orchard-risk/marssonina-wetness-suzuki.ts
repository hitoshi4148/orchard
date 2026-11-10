/**
 * 褐斑 P2c+ Phase 2: 鈴木ら（2003）系・長野モデルに近い濡れ時間延長（JST 時別）
 *
 * ## 根拠の区別
 * **二次文献で整理できたもの**（千葉県農林総合研究センター研究報告 2015(7) ほか）:
 * - 降水あり時間を濡れとする
 * - 降水終了後 2 h まで濡れ継続
 * - 終了後 2 h 以内の再降水で濡れ継続（エピソード結合）
 * - JST 20 時以降の降水 → 翌日 JST 07:00 まで濡れ（07:00 時は乾燥）
 *
 * **猫塚（2023）の記述で補強**: 夜間降雨の翌朝まで濡れ（考察）。
 *
 * **本リポジトリでは未確認（原著 PDF 未参照）**: 鈴木（2003）の全文・ルール適用順の
 * 厳密な定義、千葉モデル特有の日照・夜露ルール等。未確認部分は推測で足さない。
 *
 * ## 重複しない延長（優先）
 * 2 h 延長と夜間延長は **和集合**（終了時刻は文字列として遅い方）。二重計上なし。
 *
 * ## 降水日への帰属
 * - 各濡れ時間は、同一エピソード内で **その時刻以前で最も近い降水時刻の JST 暦日** に帰属（第1パス）。
 * - **降雨 ≥0.5mm/h** は当該降雨を含むエピソードのみが書き込み（先行夜間延長より優先）。
 * - 各降雨の直後 2 h は **その降雨の暦日** へ再帰属（第2パス。濡れキーは増やさない）。
 * - 同一エピソード内で 2 h が重なる場合は **後の降雨が優先**。
 */

import { HourlyWeatherRecord } from "../disease/nasa-power";
import { addDaysToDateString } from "../disease/met-norway-forecast";
import {
  MARSSONINA_PRECIP_WET_MM_H,
  MARSSONINA_SUZUKI_EVENING_RAIN_START_H,
  MARSSONINA_SUZUKI_MORNING_WET_END_H,
  MARSSONINA_SUZUKI_POST_RAIN_WET_H,
} from "./marssonina-constants";
import { MarssoninaAttributedWetHour } from "./marssonina-wet-types";

export type SuzukiWetKind = "precip" | "post_rain" | "night";

export interface SuzukiAttributedHour extends MarssoninaAttributedWetHour {
  wetKind: SuzukiWetKind;
}

function isValidPrecip(mm: number | null | undefined): boolean {
  return mm != null && !Number.isNaN(mm) && mm > -900;
}

export function isMarssoninaPrecipWetHour(row: HourlyWeatherRecord): boolean {
  if (!isValidPrecip(row.precipitation_mm)) return false;
  return row.precipitation_mm! >= MARSSONINA_PRECIP_WET_MM_H;
}

function hourKeyFromParts(date: string, h: number): string {
  return `${date}T${String(h).padStart(2, "0")}`;
}

function parseHourKey(key: string): { date: string; hour: number } {
  const [date, t] = key.split("T");
  const hour = Number(t.slice(0, 2));
  return { date, hour };
}

export function advanceJstHourKey(key: string, steps: number): string {
  let { date, hour } = parseHourKey(key);
  hour += steps;
  while (hour >= 24) {
    hour -= 24;
    date = addDaysToDateString(date, 1);
  }
  while (hour < 0) {
    hour += 24;
    date = addDaysToDateString(date, -1);
  }
  return hourKeyFromParts(date, hour);
}

function maxHourKey(a: string, b: string): string {
  return a >= b ? a : b;
}

function hourKeysBetweenInclusive(start: string, end: string): string[] {
  if (start > end) return [];
  const keys: string[] = [];
  let cur = start;
  let guard = 0;
  while (true) {
    keys.push(cur);
    if (cur === end) break;
    cur = advanceJstHourKey(cur, 1);
    guard += 1;
    if (guard > 24 * 21) {
      throw new Error(`Suzuki wet span guard: ${start}..${end}`);
    }
  }
  return keys;
}

/** 時刻 a から b までの時間数（a <= b であること） */
export function jstHourKeyDelta(a: string, b: string): number {
  if (a > b) return -jstHourKeyDelta(b, a);
  let steps = 0;
  let cur = a;
  let guard = 0;
  while (cur !== b) {
    cur = advanceJstHourKey(cur, 1);
    steps += 1;
    guard += 1;
    if (guard > 24 * 21) {
      throw new Error(`jstHourKeyDelta guard: ${a}..${b}`);
    }
  }
  return steps;
}

/** 20 時以降の降雨に対する夜間延長の最終濡れ時刻（翌 06 時） */
function nightWetEndKeyForRainHour(rainKey: string): string | null {
  const { date, hour } = parseHourKey(rainKey);
  if (hour < MARSSONINA_SUZUKI_EVENING_RAIN_START_H) return null;
  const nextDay = addDaysToDateString(date, 1);
  return hourKeyFromParts(nextDay, MARSSONINA_SUZUKI_MORNING_WET_END_H - 1);
}

function mergeRainEpisodes(rainKeys: string[]): string[][] {
  if (rainKeys.length === 0) return [];
  const episodes: string[][] = [];
  let current: string[] = [rainKeys[0]];
  for (let i = 1; i < rainKeys.length; i += 1) {
    const prev = current[current.length - 1];
    const next = rainKeys[i];
    if (jstHourKeyDelta(prev, next) <= MARSSONINA_SUZUKI_POST_RAIN_WET_H) {
      current.push(next);
    } else {
      episodes.push(current);
      current = [next];
    }
  }
  episodes.push(current);
  return episodes;
}

function episodeWetEndKey(rainKeys: string[]): string {
  const lastRain = rainKeys[rainKeys.length - 1];
  let endKey = advanceJstHourKey(lastRain, MARSSONINA_SUZUKI_POST_RAIN_WET_H);
  for (const rk of rainKeys) {
    const nightEnd = nightWetEndKeyForRainHour(rk);
    if (nightEnd) endKey = maxHourKey(endKey, nightEnd);
  }
  return endKey;
}

function latestRainAtOrBefore(
  episodeRains: string[],
  hourKey: string
): string | null {
  let found: string | null = null;
  for (const rk of episodeRains) {
    if (rk <= hourKey) found = rk;
    else break;
  }
  return found;
}

function classifyWetKind(
  hourKey: string,
  rainSet: Set<string>,
  lastRain: string
): SuzukiWetKind {
  if (rainSet.has(hourKey)) return "precip";
  const postEnd = advanceJstHourKey(lastRain, MARSSONINA_SUZUKI_POST_RAIN_WET_H);
  const { hour: rainH } = parseHourKey(lastRain);
  const nightEnd = nightWetEndKeyForRainHour(lastRain);
  if (
    rainH >= MARSSONINA_SUZUKI_EVENING_RAIN_START_H &&
    nightEnd &&
    jstHourKeyDelta(hourKey, postEnd) > 0 &&
    jstHourKeyDelta(hourKey, nightEnd) <= 0
  ) {
    return "night";
  }
  return "post_rain";
}

/** 第2パス: 各降雨直後2hの attribution / wetKind のみ更新（キー追加なし） */
function reassignPostRainTwoHoursAfterEachRain(
  wetByKey: Map<string, SuzukiAttributedHour>,
  episodes: string[][],
  rainSet: Set<string>
): void {
  for (const episodeRains of episodes) {
    for (const rk of episodeRains) {
      const rainDay = parseHourKey(rk).date;
      for (let s = 1; s <= MARSSONINA_SUZUKI_POST_RAIN_WET_H; s += 1) {
        const ext = advanceJstHourKey(rk, s);
        const w = wetByKey.get(ext);
        if (!w || w.isPrecipWet) continue;
        w.attributionPrecipDay = rainDay;
        w.wetKind = classifyWetKind(ext, rainSet, rk);
      }
    }
  }
}

export function buildMarssoninaSuzukiWetHours(
  hourlyByKey: Map<string, HourlyWeatherRecord>
): SuzukiAttributedHour[] {
  const keys = [...hourlyByKey.keys()].sort();
  const rainKeys = keys.filter((k) => {
    const row = hourlyByKey.get(k);
    return row && isMarssoninaPrecipWetHour(row);
  });
  const rainSet = new Set(rainKeys);
  const episodes = mergeRainEpisodes(rainKeys);
  const wetByKey = new Map<string, SuzukiAttributedHour>();

  for (const episodeRains of episodes) {
    const start = episodeRains[0];
    const end = episodeWetEndKey(episodeRains);
    const spanKeys = hourKeysBetweenInclusive(start, end);
    for (const hk of spanKeys) {
      if (wetByKey.has(hk)) continue;
      if (rainSet.has(hk) && !episodeRains.includes(hk)) continue;
      const lastRain = latestRainAtOrBefore(episodeRains, hk);
      if (!lastRain) continue;
      const attributionPrecipDay = parseHourKey(lastRain).date;
      const row = hourlyByKey.get(hk);
      const wetKind = classifyWetKind(hk, rainSet, lastRain);
      wetByKey.set(hk, {
        datetime: row?.datetime ?? `${hk}:00:00+09:00`,
        attributionPrecipDay,
        precipitation_mm: row?.precipitation_mm ?? null,
        temperature: row?.temperature ?? null,
        isPrecipWet: rainSet.has(hk),
        wetKind,
      });
    }
  }

  reassignPostRainTwoHoursAfterEachRain(wetByKey, episodes, rainSet);

  return [...wetByKey.values()].sort((a, b) =>
    a.datetime.localeCompare(b.datetime)
  );
}

export function groupSuzukiWetByPrecipDay(
  wet: SuzukiAttributedHour[]
): Map<string, SuzukiAttributedHour[]> {
  const map = new Map<string, SuzukiAttributedHour[]>();
  for (const w of wet) {
    const list = map.get(w.attributionPrecipDay) ?? [];
    list.push(w);
    map.set(w.attributionPrecipDay, list);
  }
  return map;
}
