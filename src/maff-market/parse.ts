import type { FruitConfig, MarketRow, OriginGroup } from "./types";

function trimOriginName(name: string): string {
  return name.replace(/\u3000/g, "").trim();
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-" || trimmed === "…") {
    return null;
  }
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

export function decodeShiftJis(bytes: Uint8Array): string {
  return new TextDecoder("shift_jis").decode(bytes);
}

export function parseMaffCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length <= 1) {
    return [];
  }
  return lines.slice(1).map((line) => line.split(","));
}

function rowFromParts(parts: string[]): MarketRow {
  return {
    itemCode: parts[7]?.trim() ?? "",
    itemName: parts[6]?.trim() ?? "",
    originCode: parts[9]?.trim() ?? "",
    originName: trimOriginName(parts[8] ?? ""),
    volumeKg: parseNumber(parts[10] ?? ""),
    avgPrice: parseNumber(parts[11] ?? ""),
    volumeChangePct: parseNumber(parts[12] ?? ""),
    priceChangePct: parseNumber(parts[13] ?? ""),
  };
}

export function buildOriginGroups(
  rows: string[][],
  fruit: FruitConfig
): { weekday: string; itemTotal: MarketRow | null; origins: OriginGroup[] } {
  let weekday = "";
  const parsed = rows.map((parts) => {
    if (!weekday && parts[3]) {
      weekday = parts[3].trim();
    }
    return rowFromParts(parts);
  });

  const relevant = parsed.filter((row) => {
    const code = Number(row.itemCode);
    if (row.itemCode === fruit.rootItemCode) {
      return true;
    }
    return code >= fruit.varietyCodeMin && code <= fruit.varietyCodeMax;
  });

  const itemTotal =
    relevant.find(
      (row) => row.itemCode === fruit.rootItemCode && !row.originCode
    ) ?? null;

  const originAggregates = relevant.filter(
    (row) => row.itemCode === fruit.rootItemCode && row.originCode
  );

  const varieties = relevant.filter(
    (row) => row.itemCode !== fruit.rootItemCode && row.originCode
  );

  const origins: OriginGroup[] = originAggregates.map((aggregate) => ({
    originCode: aggregate.originCode,
    originName: aggregate.originName,
    aggregate,
    varieties: varieties
      .filter((v) => v.originCode === aggregate.originCode)
      .sort((a, b) => (b.volumeKg ?? 0) - (a.volumeKg ?? 0)),
  }));

  origins.sort((a, b) => (b.aggregate.volumeKg ?? 0) - (a.aggregate.volumeKg ?? 0));

  return { weekday, itemTotal, origins };
}
