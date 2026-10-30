import { cityByCode, fruitConfigByKey, MARKET_CITIES } from "../../../src/maff-market/constants";
import { fetchFruitMarketDataset } from "../../../src/maff-market/fetch";
import type { FruitKey, FruitMarketApiResponse, FruitMarketDataset } from "../../../src/maff-market/types";

const CACHE_KEY = "https://orchard.internal/cache/fruit-market-dataset";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

let inFlight: Promise<FruitMarketDataset> | null = null;

async function loadDataset(): Promise<FruitMarketDataset> {
  const cache = caches.default;
  const cached = await cache.match(CACHE_KEY);
  if (cached) {
    return (await cached.json()) as FruitMarketDataset;
  }

  if (!inFlight) {
    inFlight = fetchFruitMarketDataset()
      .then(async (dataset) => {
        const response = new Response(JSON.stringify(dataset), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
          },
        });
        await cache.put(CACHE_KEY, response);
        return dataset;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const cityCode = url.searchParams.get("city") ?? "1301";
    const fruitKey = (url.searchParams.get("fruit") ?? "apple") as FruitKey;

    const city = cityByCode(cityCode);
    const fruit = fruitConfigByKey(fruitKey);
    if (!city || !fruit) {
      return jsonResponse(
        { success: false, error: "Invalid city or fruit parameter" },
        400
      );
    }

    const dataset = await loadDataset();
    const cityData = dataset.cities[cityCode]?.[fruitKey];
    if (!cityData) {
      return jsonResponse(
        { success: false, error: "Market data not available for this city" },
        404
      );
    }

    const marketSummaries = MARKET_CITIES.map((market) => {
      const snap = dataset.cities[market.code]?.[fruitKey];
      return {
        cityCode: market.code,
        cityName: market.name,
        avgPrice: snap?.itemTotal?.avgPrice ?? null,
        volumeKg: snap?.itemTotal?.volumeKg ?? null,
      };
    });

    const body: FruitMarketApiResponse = {
      success: true,
      targetDate: dataset.targetDate,
      weekday: dataset.weekday,
      cityCode: city.code,
      cityName: city.name,
      fruit: fruitKey,
      fruitLabel: fruit.label,
      itemTotal: cityData.itemTotal,
      origins: cityData.origins,
      marketSummaries,
    };

    return jsonResponse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
};
