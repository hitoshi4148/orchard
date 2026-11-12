import { fetchMet } from "../../../src/spray/met";
import { extractHourlyWeather } from "../../../src/weather/hourly";
import { corsJson, corsOptions } from "../../../src/portal/cors-json";

export const onRequestOptions: PagesFunction = async () => corsOptions();

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const lat = parseFloat(url.searchParams.get("lat") ?? "");
    const lon = parseFloat(url.searchParams.get("lon") ?? "");

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return corsJson(
        { success: false, error: "Invalid lat/lon" },
        { status: 400 }
      );
    }

    const data = await fetchMet(lat, lon);
    const forecast = extractHourlyWeather(data.properties.timeseries, 48);

    return corsJson({
      success: true,
      hourly: forecast.hourly,
      days: forecast.days,
      location: { lat, lon },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return corsJson({ success: false, error: message }, { status: 500 });
  }
};
