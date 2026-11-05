import type { RetailFruitKey } from "./types";

export const KAJYU_PAGE_URL =
  "https://www.maff.go.jp/j/zyukyu/anpo/kouri/kouri/kajyu.html";

export const KAJYU_PDF_BASE =
  "https://www.maff.go.jp/j/zyukyu/anpo/kouri/kouri/";

export const RETAIL_HISTORY_MONTHS = 12;

/** PDF 表の列順（バナナ index 2 は読み飛ばす） */
export const RETAIL_FRUITS: Array<{ key: RetailFruitKey; label: string; columnIndex: number }> =
  [
    { key: "apple", label: "りんご", columnIndex: 0 },
    { key: "mikan", label: "みかん", columnIndex: 1 },
    { key: "grape", label: "ぶどう", columnIndex: 3 },
    { key: "pear", label: "日本なし", columnIndex: 4 },
    { key: "peach", label: "もも", columnIndex: 5 },
  ];

export function retailFruitByKey(key: string) {
  return RETAIL_FRUITS.find((f) => f.key === key);
}
