import type { DailyWeatherRecord, HourlyWeatherRecord } from "./nasa-power";

const CACHE_ORIGIN = "https://orchard.internal/cache/nasa-power/v1";

const TTL_HISTORICAL_SECONDS = 7 * 24 * 60 * 60;
const TTL_RECENT_SECONDS = 3 * 60 * 60;

const inFlight = new Map<string, Promise<unknown>>();

function jstTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}

function addDaysYmd(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function computeNasaPowerCacheTtlSeconds(endDate: string): number {
  const yesterday = addDaysYmd(jstTodayYmd(), -1);
  return endDate < yesterday ? TTL_HISTORICAL_SECONDS : TTL_RECENT_SECONDS;
}

export function buildNasaPowerCacheKey(
  kind: "daily" | "hourly",
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  timeStandard?: string
): string {
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);
  const ts =
    kind === "hourly" ? encodeURIComponent(timeStandard ?? "LST") : "";
  const qs = new URLSearchParams({
    lat,
    lon,
    start: startDate,
    end: endDate,
  });
  if (kind === "hourly") {
    qs.set("ts", ts || "LST");
  }
  return `${CACHE_ORIGIN}/${kind}?${qs.toString()}`;
}

function workersCache(): Cache | null {
  if (typeof caches === "undefined") {
    return null;
  }
  return caches.default;
}

async function readCachedJson<T>(key: string): Promise<T | null> {
  const cache = workersCache();
  if (!cache) {
    return null;
  }
  const hit = await cache.match(key);
  if (!hit) {
    return null;
  }
  try {
    return (await hit.json()) as T;
  } catch {
    return null;
  }
}

async function writeCachedJson<T>(
  key: string,
  endDate: string,
  value: T
): Promise<void> {
  const cache = workersCache();
  if (!cache) {
    return;
  }
  const ttl = computeNasaPowerCacheTtlSeconds(endDate);
  await cache.put(
    key,
    new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${ttl}`,
      },
    })
  );
}

async function withCache<T>(
  key: string,
  endDate: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await readCachedJson<T>(key);
  if (cached !== null) {
    return cached;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const task = (async () => {
    const value = await fetcher();
    await writeCachedJson(key, endDate, value);
    return value;
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}

export async function fetchNasaPowerDailyCached(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  fetcher: () => Promise<DailyWeatherRecord[]>
): Promise<DailyWeatherRecord[]> {
  const key = buildNasaPowerCacheKey(
    "daily",
    latitude,
    longitude,
    startDate,
    endDate
  );
  return withCache(key, endDate, fetcher);
}

export async function fetchNasaPowerHourlyCached(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  timeStandard: string,
  fetcher: () => Promise<HourlyWeatherRecord[]>
): Promise<HourlyWeatherRecord[]> {
  const key = buildNasaPowerCacheKey(
    "hourly",
    latitude,
    longitude,
    startDate,
    endDate,
    timeStandard
  );
  return withCache(key, endDate, fetcher);
}
