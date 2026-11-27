export type OrchardNewsCategory =
  | "ringo"
  | "nashi"
  | "budo"
  | "momo"
  | "kiwi"
  | "fruit"
  | "general"
  | "yosoku";

export const CATEGORY_RANK: Record<OrchardNewsCategory, number> = {
  ringo: 0,
  nashi: 1,
  budo: 2,
  momo: 3,
  kiwi: 4,
  fruit: 5,
  yosoku: 6,
  general: 7,
};

const RINGO = /りんご|リンゴ|林檎|アップル|富士りんご|りんご富士/i;
const NASHI =
  /日本なし|ラ・フランス|二十世紀|幸水|豊水|新興梨|なし園|梨園|なし栽培|ナシ/i;
const BUDO = /ぶどう|ブドウ|葡萄|マスカット|シャインマスカット|デラウェア/i;
const MOMO = /もも|モモ|桃(?!花)|水蜜桃|白桃|黄桃/i;
const KIWI = /キウイ|kiwi|キウィフルーツ/i;
const FRUIT = /果樹|果樹園|果実農業|果実園|フルーツ/i;

export function classifyOrchardNews(
  title: string,
  summary = ""
): OrchardNewsCategory {
  const text = `${title} ${summary}`;
  if (RINGO.test(text)) return "ringo";
  if (NASHI.test(text)) return "nashi";
  if (BUDO.test(text)) return "budo";
  if (MOMO.test(text)) return "momo";
  if (KIWI.test(text)) return "kiwi";
  if (FRUIT.test(text)) return "fruit";
  return "general";
}

export function refineDraftCategory(
  category: OrchardNewsCategory,
  title: string,
  summary: string
): OrchardNewsCategory {
  if (category === "yosoku") {
    const fromText = classifyOrchardNews(title, summary);
    return fromText === "general" ? "yosoku" : fromText;
  }
  return classifyOrchardNews(title, summary);
}