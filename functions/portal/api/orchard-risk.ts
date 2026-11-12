import { fetchOrchardRiskForecast } from "../../../src/orchard-risk/forecast";
import { parseGymnosporangiumHostNearby } from "../../../src/orchard-risk/parse-gymnosporangium-host";
import { parseScabInoculumLevel } from "../../../src/orchard-risk/parse-ascospore-inoculum";
import { parsePriorYearStatus } from "../../../src/orchard-risk/parse-prior-year-status";
import { parseGrapeCultivationId } from "../../../src/orchard-risk/parse-grape-cultivation";
import { parseOrchardCalendarDate } from "../../../src/orchard-risk/parse-orchard-date";
import { OrchardCropId } from "../../../src/orchard-risk/types";
import { corsJson, corsOptions, PORTAL_CORS_HEADERS } from "../../../src/portal/cors-json";

const ORCHARD_RISK_CACHE_TTL_SECONDS = 5 * 60;
const ORCHARD_RISK_LOCK_TTL_SECONDS = 120;
const CACHE_POLL_INTERVAL_MS = 500;
const CACHE_POLL_MAX_ATTEMPTS = 40;

const inFlightByUrl = new Map<string, Promise<Response>>();

function parseCrop(value: string | null): OrchardCropId {
  if (value === "nashi") return "nashi";
  if (value === "grape") return "grape";
  if (value === "peach") return "peach";
  return "apple";
}

function riskCacheKey(request: Request): Request {
  return new Request(request.url, { method: "GET" });
}

function riskLockKey(cacheKey: Request): Request {
  return new Request(`${cacheKey.url}:inflight`, { method: "GET" });
}

function inflightKey(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return corsJson(body, {
    status,
    headers: {
      ...extraHeaders,
      "X-Portal-Cache": extraHeaders["X-Portal-Cache"] ?? "BYPASS",
    },
  });
}

function cachedRiskResponse(cached: Response, cacheStatus: "HIT" | "HIT-WAIT"): Response {
  const headers = new Headers(cached.headers);
  headers.set("X-Portal-Cache", cacheStatus);
  for (const [key, value] of Object.entries(PORTAL_CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(cached.body, {
    status: cached.status,
    headers,
  });
}

async function waitForCachedRisk(
  cache: Cache,
  cacheKey: Request,
  lockKey: Request
): Promise<
  | { status: "hit"; cached: Response }
  | { status: "lock-released" }
  | { status: "timeout" }
> {
  for (let attempt = 0; attempt < CACHE_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(CACHE_POLL_INTERVAL_MS);
    const cached = await cache.match(cacheKey);
    if (cached) {
      return { status: "hit", cached };
    }
    const lockHeld = await cache.match(lockKey);
    if (!lockHeld) {
      return { status: "lock-released" };
    }
  }
  return { status: "timeout" };
}

async function buildOrchardRiskForecast(request: Request): Promise<Response> {
  const cache = caches.default;
  const cacheKey = riskCacheKey(request);
  const lockKey = riskLockKey(cacheKey);

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cachedRiskResponse(cached, "HIT");
  }

  const existingLock = await cache.match(lockKey);
  if (existingLock) {
    const waitResult = await waitForCachedRisk(cache, cacheKey, lockKey);
    if (waitResult.status === "hit") {
      return cachedRiskResponse(waitResult.cached, "HIT-WAIT");
    }
    if (waitResult.status === "timeout") {
      const lockStillHeld = await cache.match(lockKey);
      if (lockStillHeld) {
        return jsonResponse(
          {
            success: false,
            error:
              "気象データを準備中です。数十秒後に再読み込みしてください。",
          },
          503,
          { "Retry-After": "3", "X-Portal-Cache": "WAIT-TIMEOUT" }
        );
      }
    }
  }

  await cache.put(
    lockKey,
    new Response("1", {
      headers: {
        "Cache-Control": `max-age=${ORCHARD_RISK_LOCK_TTL_SECONDS}`,
      },
    })
  );

  try {
    const cachedAfterLock = await cache.match(cacheKey);
    if (cachedAfterLock) {
      return cachedRiskResponse(cachedAfterLock, "HIT");
    }

    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lon = parseFloat(url.searchParams.get("lon") ?? "");
    const crop = parseCrop(url.searchParams.get("crop"));
    const variety = url.searchParams.get("variety")?.trim() || "";
    const growthStage =
      url.searchParams.get("growth_stage")?.trim() || "youngfruit";
    const bloomStart = parseOrchardCalendarDate(
      url.searchParams.get("bloom_start")
    );
    const greenTipDate = parseOrchardCalendarDate(
      url.searchParams.get("green_tip")
    );
    const gymnosporangiumHostNearby = parseGymnosporangiumHostNearby(
      url.searchParams.get("gymnosporangium_host")
    );
    const scabInoculumLevel = parseScabInoculumLevel(
      url.searchParams.get("scab_inoculum")
    );
    const priorYearStatus = parsePriorYearStatus(
      url.searchParams.get("prior_year")
    );
    const grapeCultivationId = parseGrapeCultivationId(
      url.searchParams.get("grape_cultivation") ??
        url.searchParams.get("cultivation")
    );

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return jsonResponse(
        { success: false, error: "lat と lon が必要です" },
        400
      );
    }

    const includeMarssoninaOnset =
      url.searchParams.get("marssonina_onset") !== "0";

    const forecast = await fetchOrchardRiskForecast(
      lat,
      lon,
      crop,
      variety ||
        (crop === "nashi"
          ? "幸水"
          : crop === "grape"
            ? "シャインマスカット"
            : crop === "peach"
              ? "川中島白桃"
              : "ふじ"),
      growthStage,
      crop === "apple" ? bloomStart : null,
      {
        includeMarssoninaOnset,
        greenTipDate: crop === "apple" ? greenTipDate : null,
        scabInoculumLevel: crop === "apple" ? scabInoculumLevel : null,
        gymnosporangiumHostNearby:
          crop === "nashi" ? gymnosporangiumHostNearby : null,
        priorYearStatus: crop === "peach" ? priorYearStatus : null,
        grapeCultivationId: crop === "grape" ? grapeCultivationId : null,
      }
    );

    const response = jsonResponse(
      {
        success: true,
        forecast,
      },
      200,
      {
        "Cache-Control": `public, max-age=${ORCHARD_RISK_CACHE_TTL_SECONDS}`,
        "CDN-Cache-Control": `max-age=${ORCHARD_RISK_CACHE_TTL_SECONDS}`,
        "X-Portal-Cache": "MISS",
      }
    );

    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("取得できません") ? 503 : 500;
    return jsonResponse({ success: false, error: message }, status);
  } finally {
    await cache.delete(lockKey);
  }
}

async function runOrchardRiskRequest(request: Request): Promise<Response> {
  try {
    return await buildOrchardRiskForecast(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ success: false, error: message }, 500);
  }
}

export const onRequestOptions: PagesFunction = async () => corsOptions();

export const onRequestGet: PagesFunction = async (context) => {
  const key = inflightKey(context.request);
  const existing = inFlightByUrl.get(key);
  if (existing) {
    return existing;
  }

  const pending = runOrchardRiskRequest(context.request).then(
    (response) => {
      inFlightByUrl.delete(key);
      return response;
    },
    (error) => {
      inFlightByUrl.delete(key);
      throw error;
    }
  );

  inFlightByUrl.set(key, pending);
  return pending;
};
