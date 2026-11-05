import {
  readCachedDataset,
  refreshRetailDatasetIfNeeded,
} from "../../../src/maff-retail-kajyu/dataset-loader";

interface RefreshEnv {
  CRON_SECRET?: string;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function isAuthorized(request: Request, env: RefreshEnv): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("Authorization") ?? "";
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const headerSecret = request.headers.get("X-Cron-Secret");
  return headerSecret === secret;
}

export const onRequestPost: PagesFunction<RefreshEnv> = async ({
  request,
  env,
}) => {
  if (!isAuthorized(request, env)) {
    return unauthorized();
  }

  try {
    let force = false;
    try {
      const body = (await request.json()) as { force?: boolean };
      force = body?.force === true;
    } catch {
      force = false;
    }

    const before = await readCachedDataset();
    const { dataset, refreshed } = await refreshRetailDatasetIfNeeded({
      force,
      fallback: before,
    });
    return jsonResponse({
      success: true,
      refreshed,
      pdfUrl: dataset.pdfUrl,
      surveyLabel: dataset.latest.surveyLabel,
      previousPdfUrl: before?.pdfUrl ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ success: false, error: message }, 500);
  }
};
