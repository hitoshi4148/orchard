export type RetailFruitKey = "apple" | "mikan" | "grape" | "pear" | "peach";

export interface RetailFruitPoint {
  priceYenPerKg: number | null;
  momIndexPct: number | null;
  yoyIndexPct: number | null;
}

export interface RetailFruitMonthRow {
  reiwaYear: number;
  month: number;
  surveyLabel: string;
  surveyPeriod: string;
  prices: Record<RetailFruitKey, number | null>;
}

export interface RetailKajyuDataset {
  sourcePageUrl: string;
  pdfUrl: string;
  fetchedAt: string;
  latest: RetailFruitMonthRow & {
    detail: Record<RetailFruitKey, RetailFruitPoint>;
  };
  history: RetailFruitMonthRow[];
}

export interface RetailKajyuApiResponse {
  success: boolean;
  fruit?: RetailFruitKey;
  fruitLabel?: string;
  latest?: RetailKajyuDataset["latest"];
  history?: Array<{
    label: string;
    surveyPeriod: string;
    priceYenPerKg: number | null;
  }>;
  error?: string;
}
