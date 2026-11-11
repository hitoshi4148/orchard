import { fetchOrchardRiskForecast } from "../../../src/orchard-risk/forecast";
import { OrchardCropId } from "../../../src/orchard-risk/types";

function parseCrop(value: string | null): OrchardCropId {
  return value === "nashi" ? "nashi" : "apple";
}

/** YYYY-MM-DD のみ受理 */
function parseBloomStart(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lon = parseFloat(url.searchParams.get("lon") ?? "");
    const crop = parseCrop(url.searchParams.get("crop"));
    const variety = url.searchParams.get("variety")?.trim() || "";
    const growthStage =
      url.searchParams.get("growth_stage")?.trim() || "youngfruit";
    const bloomStart = parseBloomStart(url.searchParams.get("bloom_start"));

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return Response.json(
        { success: false, error: "lat と lon が必要です" },
        { status: 400 }
      );
    }

    const includeMarssoninaOnset =
      url.searchParams.get("marssonina_onset") !== "0";

    const forecast = await fetchOrchardRiskForecast(
      lat,
      lon,
      crop,
      variety || (crop === "nashi" ? "幸水" : "ふじ"),
      growthStage,
      crop === "apple" ? bloomStart : null,
      { includeMarssoninaOnset }
    );

    return Response.json({
      success: true,
      forecast,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("取得できません") ? 503 : 500;
    return Response.json({ success: false, error: message }, { status });
  }
};
