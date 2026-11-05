import { RETAIL_FRUITS } from "../../../src/maff-retail-kajyu/constants";
import {
  readCachedDataset,
  refreshRetailDatasetIfNeeded,
  writeCachedDataset,
} from "../../../src/maff-retail-kajyu/dataset-loader";
import type { RetailKajyuDataset } from "../../../src/maff-retail-kajyu/types";

const SNAPSHOT_PATH = "/portal/data/fruit-retail-kajyu.json";

let inFlight: Promise<RetailKajyuDataset> | null = null;

async function loadSnapshot(request: Request): Promise<RetailKajyuDataset> {
  const url = new URL(SNAPSHOT_PATH, request.url);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `Retail snapshot missing (${res.status}). Run: npm run sync:fruit-retail`
    );
  }
  return (await res.json()) as RetailKajyuDataset;
}

async function loadDataset(request: Request): Promise<RetailKajyuDataset> {
  if (!inFlight) {
    inFlight = (async () => {
      const cached = await readCachedDataset();
      const snapshot = cached ?? (await loadSnapshot(request));
      if (!cached) {
        await writeCachedDataset(snapshot);
      }

      const { dataset } = await refreshRetailDatasetIfNeeded({
        fallback: snapshot,
      });
      return dataset;
    })().finally(() => {
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

export const onRequestGet: PagesFunction = async ({ request }) => {
  try {
    const dataset = await loadDataset(request);
    return jsonResponse({
      success: true,
      fruits: RETAIL_FRUITS.map((f) => ({ key: f.key, label: f.label })),
      ...dataset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
};
