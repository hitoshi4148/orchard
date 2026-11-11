import { fetchOrchardRiskForecast } from "../../../src/orchard-risk/forecast";
import { parseGymnosporangiumHostNearby } from "../../../src/orchard-risk/parse-gymnosporangium-host";
import { parseScabInoculumLevel } from "../../../src/orchard-risk/parse-ascospore-inoculum";
import { parseOrchardCalendarDate } from "../../../src/orchard-risk/parse-orchard-date";
import { OrchardCropId } from "../../../src/orchard-risk/types";

function parseCrop(value: string | null): OrchardCropId {
  return value === "nashi" ? "nashi" : "apple";
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
      {
        includeMarssoninaOnset,
        greenTipDate: crop === "apple" ? greenTipDate : null,
        scabInoculumLevel: crop === "apple" ? scabInoculumLevel : null,
        gymnosporangiumHostNearby:
          crop === "nashi" ? gymnosporangiumHostNearby : null,
      }
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
