import type { FruitConfig, MarketCity } from "./types";

export const MAFF_FORM_URL =
  "https://www.seisen.maff.go.jp/seisen/bs04b040md001/BS04B040UC020SC001-Evt007.do";
export const MAFF_DOWNLOAD_URL =
  "https://www.seisen.maff.go.jp/seisen/bs04b040md001/BS04B040UC020SC002-Evt001.do";

export const MARKET_CITIES: MarketCity[] = [
  { code: "5101", name: "札幌", slug: "sapporo" },
  { code: "0401", name: "仙台", slug: "sendai" },
  { code: "1301", name: "東京", slug: "tokyo" },
  { code: "1401", name: "横浜", slug: "yokohama" },
  { code: "2301", name: "名古屋", slug: "nagoya" },
  { code: "2601", name: "京都", slug: "kyoto" },
  { code: "2701", name: "大阪", slug: "oosaka" },
  { code: "4002", name: "福岡", slug: "hukuoka" },
];

export const FRUITS: FruitConfig[] = [
  {
    key: "apple",
    label: "りんご",
    rootItemCode: "42000",
    varietyCodeMin: 42001,
    varietyCodeMax: 42999,
  },
  {
    key: "pear",
    label: "なし",
    rootItemCode: "43000",
    varietyCodeMin: 43001,
    varietyCodeMax: 43499,
  },
  {
    key: "grape",
    label: "ぶどう",
    rootItemCode: "45000",
    varietyCodeMin: 45001,
    varietyCodeMax: 45299,
  },
  {
    key: "kiwi",
    label: "キウイ",
    rootItemCode: "49300",
    varietyCodeMin: 49301,
    varietyCodeMax: 49399,
  },
  {
    key: "mikan",
    label: "みかん",
    rootItemCode: "40100",
    varietyCodeMin: 40101,
    varietyCodeMax: 40999,
  },
  {
    key: "persimmon",
    label: "かき",
    rootItemCode: "43500",
    varietyCodeMin: 43501,
    varietyCodeMax: 43799,
  },
  {
    key: "peach",
    label: "もも",
    rootItemCode: "44100",
    varietyCodeMin: 44101,
    varietyCodeMax: 44699,
  },
  {
    key: "strawberry",
    label: "いちご",
    rootItemCode: "46100",
    varietyCodeMin: 46101,
    varietyCodeMax: 46199,
  },
  {
    key: "melon",
    label: "メロン",
    rootItemCode: "47000",
    varietyCodeMin: 47001,
    varietyCodeMax: 47299,
  },
];

export function fruitConfigByKey(key: string): FruitConfig | undefined {
  return FRUITS.find((f) => f.key === key);
}

export function cityByCode(code: string): MarketCity | undefined {
  return MARKET_CITIES.find((c) => c.code === code);
}
