/**
 * りんご黒星（子囊孢子一次感染）— 簡易季節窓 + 緯度3帯（全国向け目安）
 *
 * Mills 法は「条件が揃えば感染しうる」評価のため、子囊孢子放出のない時期は
 * スコアを抑え、根拠に季節を明示する（子囊孢子は GDD・降水放出と連動）。
 *
 * 群馬県内（代表顧客地域）は経度込みで監視暦日をやや早めに設定（関東内陸子囊孢子目安）。
 */

import { isGunmaOrchardLatLon } from "./gunma-reference";

export type AppleScabLatBand = "north" | "central" | "south" | "gunma";

/** MM-DD（暦日・おおよその子囊孢子監視期） */
export interface AppleScabSeasonWindow {
  band: AppleScabLatBand;
  label: string;
  start: string;
  end: string;
}

const WINDOWS: AppleScabSeasonWindow[] = [
  {
    band: "north",
    label: "北国帯（lat≥39.5°）",
    start: "04-25",
    end: "07-20",
  },
  {
    band: "central",
    label: "中間帯（34.5°≤lat<39.5°・関東内陸など）",
    start: "04-05",
    end: "07-31",
  },
  {
    band: "south",
    label: "南西帯（lat<34.5°）",
    start: "03-20",
    end: "08-10",
  },
];

/** 群馬県内果樹園向け（中間帯よりやや早い子囊孢子監視暦日） */
const GUNMA_WINDOW: AppleScabSeasonWindow = {
  band: "gunma",
  label: "群馬県内（関東内陸子囊孢子目安）",
  start: "04-01",
  end: "07-28",
};

/** 一次子囊孢子の主対象生育ステージ */
const PRIMARY_SCAB_STAGES = new Set([
  "bud",
  "bloom",
  "petalfall",
  "youngfruit",
  "fruitgrowth",
]);

export function resolveAppleScabLatBand(lat: number): AppleScabLatBand {
  if (lat >= 39.5) return "north";
  if (lat >= 34.5) return "central";
  return "south";
}

export function getAppleScabSeasonWindow(
  lat: number,
  lon?: number
): AppleScabSeasonWindow {
  if (lon !== undefined && isGunmaOrchardLatLon(lat, lon)) {
    return GUNMA_WINDOW;
  }
  const band = resolveAppleScabLatBand(lat);
  return WINDOWS.find((w) => w.band === band)!;
}

function parseMonthDay(mmdd: string): number {
  const [m, d] = mmdd.split("-").map(Number);
  return m * 100 + d;
}

function jstMonthDayFromIso(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(iso));
  const m = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const d = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return m * 100 + d;
}

export function isJstDateInAppleScabWindow(
  isoDateTime: string,
  window: AppleScabSeasonWindow
): boolean {
  const cur = jstMonthDayFromIso(isoDateTime);
  const start = parseMonthDay(window.start);
  const end = parseMonthDay(window.end);
  return cur >= start && cur <= end;
}

export interface AppleScabPrimarySeasonStatus {
  inPrimarySeason: boolean;
  window: AppleScabSeasonWindow;
  growthStageId: string;
  reason: string;
}

export function evaluateAppleScabPrimarySeason(
  lat: number,
  targetDateTime: string,
  growthStageId: string,
  lon?: number
): AppleScabPrimarySeasonStatus {
  const window = getAppleScabSeasonWindow(lat, lon);
  const inCalendar = isJstDateInAppleScabWindow(targetDateTime, window);

  if (growthStageId === "harvest") {
    return {
      inPrimarySeason: false,
      window,
      growthStageId,
      reason: `生育ステージ「収穫期」のため子囊孢子一次感染の監視対象外（${window.label}・${window.start}〜${window.end}）。`,
    };
  }

  if (!PRIMARY_SCAB_STAGES.has(growthStageId)) {
    return {
      inPrimarySeason: false,
      window,
      growthStageId,
      reason: `生育ステージ「${growthStageId}」は子囊孢子一次感染の簡易窓に含めていません。`,
    };
  }

  if (!inCalendar) {
    return {
      inPrimarySeason: false,
      window,
      growthStageId,
      reason: `子囊孢子期外（${window.label}・監視暦日 ${window.start}〜${window.end}、対象日は期外）。`,
    };
  }

  return {
    inPrimarySeason: true,
    window,
    growthStageId,
    reason: `子囊孢子一次感染の監視期間内（${window.label}・${window.start}〜${window.end}）。`,
  };
}
