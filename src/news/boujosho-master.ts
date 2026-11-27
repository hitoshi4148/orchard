import data from "../../data/news/boujosho-prefectures.json";

export interface BoujoshoPrefecture {
  name: string;
  homePageUrl: string;
}

const prefectures = data.prefectures as BoujoshoPrefecture[];

export function listBoujoshoPrefectures(): BoujoshoPrefecture[] {
  return prefectures;
}

export function findBoujoshoPrefecture(name: string): BoujoshoPrefecture | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const exact = prefectures.find((row) => row.name === trimmed);
  if (exact) return exact;
  const short = trimmed.replace(/(都|府|県)$/, "");
  return (
    prefectures.find((row) => row.name.startsWith(short) || row.name.includes(trimmed)) ??
    null
  );
}