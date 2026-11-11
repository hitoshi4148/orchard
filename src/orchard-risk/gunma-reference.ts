/**
 * 群馬県の果樹園向け参照（検証・UI・季節窓チューニング）
 * 主要顧客が群馬に集中する前提の代表座標と目安値。
 */

export interface GunmaReferenceSite {
  id: string;
  label: string;
  municipality: string;
  lat: number;
  lon: number;
  /** 褐斑一次感染探索の開花始期ゴールデン（NASA 実測整合） */
  validationBloomStart: string;
}

/** 群馬県概略バウンディング（果樹産地） */
export function isGunmaOrchardLatLon(lat: number, lon: number): boolean {
  return lat >= 36.0 && lat <= 37.15 && lon >= 138.65 && lon <= 139.75;
}

/** ふじ等の開花始期の暦日目安（群馬・前橋周辺、4月下旬） */
export const GUNMA_TYPICAL_BLOOM_MONTH_DAY = "04-22";

/** りんご緑期（green tip）の暦日目安（群馬・関東内陸、3月下旬） */
export const GUNMA_TYPICAL_GREEN_TIP_MONTH_DAY = "03-25";

export function gunmaTypicalBloomStartIso(year: number): string {
  return `${year}-${GUNMA_TYPICAL_BLOOM_MONTH_DAY}`;
}

/** 検証・回帰用の群馬代表地点 */
export const GUNMA_VALIDATION_SITES: GunmaReferenceSite[] = [
  {
    id: "maebashi",
    label: "前橋（標準UI）",
    municipality: "前橋市",
    lat: 36.39,
    lon: 139.06,
    validationBloomStart: "2026-04-22",
  },
  {
    id: "takasaki",
    label: "高崎",
    municipality: "高崎市",
    lat: 36.322,
    lon: 139.003,
    validationBloomStart: "2026-04-22",
  },
  {
    id: "shibukawa",
    label: "渋川・赤城南麓",
    municipality: "渋川市",
    lat: 36.489,
    lon: 139.007,
    validationBloomStart: "2026-04-22",
  },
  {
    id: "numata",
    label: "沼田・利根沼田",
    municipality: "沼田市",
    lat: 36.646,
    lon: 139.043,
    validationBloomStart: "2026-04-22",
  },
];

/** UI 設定モーダル用のワンタップ地点 */
export const GUNMA_LOCATION_PRESETS = GUNMA_VALIDATION_SITES.map((s) => ({
  id: s.id,
  label: `${s.label}（${s.municipality}）`,
  lat: s.lat,
  lon: s.lon,
}));
