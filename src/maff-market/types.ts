export type FruitKey = "apple" | "pear" | "grape" | "kiwi";

export interface MarketCity {
  code: string;
  name: string;
  slug: string;
}

export interface FruitConfig {
  key: FruitKey;
  label: string;
  rootItemCode: string;
  varietyCodeMin: number;
  varietyCodeMax: number;
}

export interface MarketRow {
  itemCode: string;
  itemName: string;
  originCode: string;
  originName: string;
  volumeKg: number | null;
  avgPrice: number | null;
  priceChangePct: number | null;
  volumeChangePct: number | null;
}

export interface OriginGroup {
  originCode: string;
  originName: string;
  aggregate: MarketRow;
  varieties: MarketRow[];
}

export interface CityFruitSnapshot {
  cityCode: string;
  cityName: string;
  fruit: FruitKey;
  itemTotal: MarketRow | null;
  origins: OriginGroup[];
}

export interface FruitMarketDataset {
  targetDate: string;
  weekday: string;
  fetchedAt: string;
  cities: Record<string, Record<FruitKey, CityFruitSnapshot>>;
}

export interface FruitMarketApiResponse {
  success: boolean;
  targetDate: string;
  weekday: string;
  cityCode: string;
  cityName: string;
  fruit: FruitKey;
  fruitLabel: string;
  itemTotal: MarketRow | null;
  origins: OriginGroup[];
  marketSummaries: Array<{
    cityCode: string;
    cityName: string;
    avgPrice: number | null;
    volumeKg: number | null;
  }>;
  error?: string;
}
