import {
  FRUITS,
  MAFF_DOWNLOAD_URL,
  MAFF_FORM_URL,
  MARKET_CITIES,
} from "./constants";
import { buildOriginGroups, decodeShiftJis, parseMaffCsv } from "./parse";
import type { FruitKey, FruitMarketDataset } from "./types";

function getTendays(day: number): 1 | 2 | 3 {
  if (day <= 10) {
    return 1;
  }
  if (day <= 20) {
    return 2;
  }
  return 3;
}

function sessionIdFromHtml(html: string): string | null {
  const match = html.match(/name="s027\.sessionId"\s+value="([^"]+)"/);
  return match?.[1] ?? null;
}

async function fetchMonthlyZip(now: Date): Promise<Uint8Array> {
  const formRes = await fetch(MAFF_FORM_URL, {
    headers: { "User-Agent": "orchard-portal/1.0 (maff-market-data)" },
  });
  if (!formRes.ok) {
    throw new Error(`MAFF form fetch failed (${formRes.status})`);
  }
  const html = await formRes.text();
  const sessionId = sessionIdFromHtml(html);
  if (!sessionId) {
    throw new Error("MAFF sessionId not found");
  }

  const body = new URLSearchParams({
    "s027.sessionId": sessionId,
    "s027.year": String(now.getFullYear()),
    "s027.month": String(now.getMonth() + 1).padStart(2, "0"),
    "s027.tendays": String(getTendays(now.getDate())),
    "s027.chohyoFileType": "CSV",
  });

  const downloadRes = await fetch(MAFF_DOWNLOAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "orchard-portal/1.0 (maff-market-data)",
    },
    body: body.toString(),
  });
  if (!downloadRes.ok) {
    throw new Error(`MAFF CSV download failed (${downloadRes.status})`);
  }
  const buffer = await downloadRes.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("MAFF download was not a ZIP file");
  }
  return bytes;
}

const FRUIT_CITY_FILE =
  /^(?:\d{8})tk_(1301_tokyo|2701_oosaka|2301_nagoya|4002_hukuoka)\.csv$/;

function unzipFruitCityEntries(
  zipBytes: Uint8Array
): Promise<Record<string, Uint8Array>> {
  return import("fflate").then(
    ({ unzip }) =>
      new Promise((resolve, reject) => {
        unzip(
          zipBytes,
          {
            filter: (file) => FRUIT_CITY_FILE.test(file.name),
          },
          (error, data) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(data);
          }
        );
      })
  );
}

function latestDateForCity(
  entries: Record<string, Uint8Array>,
  cityCode: string,
  citySlug: string
): string | null {
  const pattern = new RegExp(`^(\\d{8})tk_${cityCode}_${citySlug}\\.csv$`);
  let latest: string | null = null;
  for (const name of Object.keys(entries)) {
    const base = name.split("/").pop() ?? name;
    const match = base.match(pattern);
    if (match && (!latest || match[1] > latest)) {
      latest = match[1];
    }
  }
  return latest;
}

function resolveTargetDate(entries: Record<string, Uint8Array>): string {
  const dates = MARKET_CITIES.map((city) =>
    latestDateForCity(entries, city.code, city.slug)
  ).filter((d): d is string => Boolean(d));

  if (dates.length === 0) {
    throw new Error("No city fruit CSV found in MAFF ZIP");
  }
  return dates.sort().at(-1)!;
}

function formatTargetDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export async function fetchFruitMarketDataset(): Promise<FruitMarketDataset> {
  const now = new Date();
  const zipBytes = await fetchMonthlyZip(now);
  const entries = await unzipFruitCityEntries(zipBytes);
  const targetDateKey = resolveTargetDate(entries);

  const cities: FruitMarketDataset["cities"] = {};
  let weekday = "";

  for (const city of MARKET_CITIES) {
    const fileName = `${targetDateKey}tk_${city.code}_${city.slug}.csv`;
    const entry =
      entries[fileName] ??
      entries[Object.keys(entries).find((k) => k.endsWith(fileName)) ?? ""];

    if (!entry) {
      continue;
    }

    const csvText = decodeShiftJis(entry);
    const rows = parseMaffCsv(csvText);
    cities[city.code] = {} as FruitMarketDataset["cities"][string];

    for (const fruit of FRUITS) {
      const built = buildOriginGroups(rows, fruit);
      if (!weekday && built.weekday) {
        weekday = built.weekday;
      }
      cities[city.code][fruit.key as FruitKey] = {
        cityCode: city.code,
        cityName: city.name,
        fruit: fruit.key as FruitKey,
        itemTotal: built.itemTotal,
        origins: built.origins,
      };
    }
  }

  return {
    targetDate: formatTargetDate(targetDateKey),
    weekday,
    fetchedAt: now.toISOString(),
    cities,
  };
}
