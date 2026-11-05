import { RETAIL_FRUITS, RETAIL_HISTORY_MONTHS } from "./constants";
import type { RetailFruitKey, RetailFruitMonthRow, RetailKajyuDataset } from "./types";

function normalizeDigits(value: string): string {
  return value.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

function parsePriceToken(token: string): number | null {
  const t = normalizeDigits(token.trim()).replace(/,/g, "");
  if (!t || t === "-" || t === "ー" || t === "－") {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIndexPctToken(token: string): number | null {
  const t = normalizeDigits(token.trim());
  if (!t || t === "-" || t === "ー" || t === "－") {
    return null;
  }
  const m = t.match(/^(\d+(?:\.\d+)?)%?$/);
  if (!m) {
    return null;
  }
  return Number(m[1]);
}

function emptyPrices(): Record<RetailFruitKey, number | null> {
  return {
    apple: null,
    mikan: null,
    grape: null,
    pear: null,
    peach: null,
  };
}

function mapRowValues(tokens: string[]): Record<RetailFruitKey, number | null> {
  const prices = emptyPrices();
  for (const fruit of RETAIL_FRUITS) {
    prices[fruit.key] = parsePriceToken(tokens[fruit.columnIndex] ?? "");
  }
  return prices;
}

function parseHistoryTable(text: string): RetailFruitMonthRow[] {
  const section = text.split("調査期間")[1]?.split("注１")[0] ?? "";
  const normalized = normalizeDigits(section);
  const rows: RetailFruitMonthRow[] = [];
  const blockRe = /令和(\d+)年(\d+)月[\s\S]*?（([^）]+)）\s*([^\n]+)/g;

  for (const match of normalized.matchAll(blockRe)) {
    const reiwaYear = Number(match[1]);
    const month = Number(match[2]);
    const surveyPeriod = match[3].trim();
    const valueLine = match[4].trim();
    const tokens = valueLine.split(/\s+/);
    rows.push({
      reiwaYear,
      month,
      surveyLabel: `令和${reiwaYear}年${month}月`,
      surveyPeriod,
      prices: mapRowValues(tokens),
    });
  }

  return rows;
}

function parseLatestSummary(text: string): {
  row: RetailFruitMonthRow;
  mom: Record<RetailFruitKey, number | null>;
  yoy: Record<RetailFruitKey, number | null>;
} | null {
  const head = text.split("調査期間")[0] ?? text;
  const normalized = normalizeDigits(head);
  const monthMatch = normalized.match(/令和(\d+)年(\d+)月/);
  const periodMatch = normalized.match(/（([^）]+)）/);
  const priceLine = normalized.match(/価格\s+([^\n]+)/);
  const momLine = normalized.match(/前月比\s+([^\n]+)/);
  const yoyLine = normalized.match(/前年比\s+([^\n]+)/);

  if (!monthMatch || !periodMatch || !priceLine) {
    return null;
  }

  const reiwaYear = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  const priceTokens = priceLine[1].trim().split(/\s+/);
  const momTokens = momLine?.[1]?.trim().split(/\s+/) ?? [];
  const yoyTokens = yoyLine?.[1]?.trim().split(/\s+/) ?? [];

  const mom = emptyPrices();
  const yoy = emptyPrices();
  for (const fruit of RETAIL_FRUITS) {
    mom[fruit.key] = parseIndexPctToken(momTokens[fruit.columnIndex] ?? "");
    yoy[fruit.key] = parseIndexPctToken(yoyTokens[fruit.columnIndex] ?? "");
  }

  return {
    row: {
      reiwaYear,
      month,
      surveyLabel: `令和${reiwaYear}年${month}月`,
      surveyPeriod: periodMatch[1].trim(),
      prices: mapRowValues(priceTokens),
    },
    mom,
    yoy,
  };
}

function sortKey(row: RetailFruitMonthRow): number {
  return row.reiwaYear * 100 + row.month;
}

function takeLast12Months(rows: RetailFruitMonthRow[]): RetailFruitMonthRow[] {
  const unique = new Map<number, RetailFruitMonthRow>();
  for (const row of rows) {
    unique.set(sortKey(row), row);
  }
  return [...unique.values()]
    .sort((a, b) => sortKey(a) - sortKey(b))
    .slice(-RETAIL_HISTORY_MONTHS);
}

export function parseKajyuPdfText(
  text: string,
  meta: { sourcePageUrl: string; pdfUrl: string; fetchedAt: string }
): RetailKajyuDataset {
  const historyAll = parseHistoryTable(text);
  const history = takeLast12Months(historyAll);
  const summary = parseLatestSummary(text);

  const latestRow =
    summary?.row ??
    history.at(-1) ??
    (() => {
      throw new Error("Could not parse latest retail fruit survey month");
    })();

  const detail = {} as RetailKajyuDataset["latest"]["detail"];
  for (const fruit of RETAIL_FRUITS) {
    detail[fruit.key] = {
      priceYenPerKg: latestRow.prices[fruit.key],
      momIndexPct: summary?.mom[fruit.key] ?? null,
      yoyIndexPct: summary?.yoy[fruit.key] ?? null,
    };
  }

  return {
    sourcePageUrl: meta.sourcePageUrl,
    pdfUrl: meta.pdfUrl,
    fetchedAt: meta.fetchedAt,
    latest: {
      ...latestRow,
      detail,
    },
    history,
  };
}
