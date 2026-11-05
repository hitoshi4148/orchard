import { KAJYU_PAGE_URL } from "./constants";
import { fetchLatestKajyuPdfUrl, fetchPdfBytes } from "./maff-fetch";
import { extractPdfTextInWorker } from "./pdf-worker";
import { parseKajyuPdfText } from "./parse";
import type { RetailKajyuDataset } from "./types";

export const RETAIL_CACHE_KEY =
  "https://orchard.internal/cache/fruit-retail-kajyu-v1";
export const RETAIL_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function fetchRetailKajyuDatasetInWorker(): Promise<RetailKajyuDataset> {
  const pdfUrl = await fetchLatestKajyuPdfUrl();
  const bytes = await fetchPdfBytes(pdfUrl);
  const text = await extractPdfTextInWorker(bytes);
  return parseKajyuPdfText(text, {
    sourcePageUrl: KAJYU_PAGE_URL,
    pdfUrl,
    fetchedAt: new Date().toISOString(),
  });
}

export async function readCachedDataset(): Promise<RetailKajyuDataset | null> {
  const cached = await caches.default.match(RETAIL_CACHE_KEY);
  if (!cached) {
    return null;
  }
  return (await cached.json()) as RetailKajyuDataset;
}

export async function writeCachedDataset(
  dataset: RetailKajyuDataset
): Promise<void> {
  const response = new Response(JSON.stringify(dataset), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${RETAIL_CACHE_TTL_SECONDS}`,
    },
  });
  await caches.default.put(RETAIL_CACHE_KEY, response);
}

export async function refreshRetailDatasetIfNeeded(
  options: {
    force?: boolean;
    fallback?: RetailKajyuDataset | null;
  } = {}
): Promise<{ dataset: RetailKajyuDataset; refreshed: boolean }> {
  const cached = options.fallback ?? (await readCachedDataset());
  const latestPdfUrl = await fetchLatestKajyuPdfUrl();

  const needsRefresh =
    options.force ||
    !cached ||
    cached.pdfUrl !== latestPdfUrl;

  if (!needsRefresh) {
    return { dataset: cached, refreshed: false };
  }

  try {
    const dataset = await fetchRetailKajyuDatasetInWorker();
    await writeCachedDataset(dataset);
    return { dataset, refreshed: true };
  } catch (error) {
    if (cached && !options.force) {
      return { dataset: cached, refreshed: false };
    }
    throw error;
  }
}
