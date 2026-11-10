import {
  addDaysToDateString,
  extractMetNorwayForecast,
  jstTodayString,
} from "../disease/met-norway-forecast";
import {
  DailyWeatherRecord,
  fetchNasaPowerDaily,
  fetchNasaPowerHourly,
  filterDailyByDateRange,
} from "../disease/nasa-power";
import { computeDiseaseRiskForecast } from "../disease/prepare-data";
import { buildGpSeriesList } from "../growth-potential/gp-calculator";
import {
  buildMonthlyAverageTemperatures,
  getLastCalendarYearJst,
} from "../growth-potential/monthly-temperature";
import { fetchMet } from "../spray/met";
import { judge } from "../spray/judge";
import { extractHourlyWeather } from "../weather/hourly";

export interface PortalDashboardData {
  weather: ReturnType<typeof extractHourlyWeather>;
  diseaseRisk: ReturnType<typeof computeDiseaseRiskForecast>;
  growthPotential: {
    year: number;
    monthlyTemperatures: Array<number | null>;
    series: ReturnType<typeof buildGpSeriesList>;
  };
  sprayForecast: ReturnType<typeof judge>;
}

/** ページ機能に合わせて取得するモジュール（未指定時は従来どおり全部） */
export interface PortalDashboardNeed {
  weather: boolean;
  disease: boolean;
  growthPotential: boolean;
  spray: boolean;
}

export const PORTAL_DASHBOARD_NEED_ALL: PortalDashboardNeed = {
  weather: true,
  disease: true,
  growthPotential: true,
  spray: true,
};

export function parsePortalDashboardNeed(raw: string | null): PortalDashboardNeed {
  if (!raw?.trim()) {
    return { ...PORTAL_DASHBOARD_NEED_ALL };
  }
  const parts = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  return {
    weather: parts.has("weather"),
    disease: parts.has("disease"),
    growthPotential: parts.has("gp") || parts.has("growth"),
    spray: parts.has("spray"),
  };
}

export async function fetchPortalDashboard(
  latitude: number,
  longitude: number,
  warmGrass: string,
  coolGrass: string,
  need: PortalDashboardNeed = PORTAL_DASHBOARD_NEED_ALL
): Promise<PortalDashboardData> {
  const lastYear = getLastCalendarYearJst();
  const today = jstTodayString();
  const endDate = addDaysToDateString(today, -1);
  const diseaseStartDate = addDaysToDateString(today, -7);

  const wantsNasa = need.disease || need.growthPotential;
  const metData = await fetchMet(latitude, longitude);

  const weather = need.weather
    ? extractHourlyWeather(metData.properties.timeseries, 48)
    : { hourly: [], days: [] };

  let nasaDailyAll: DailyWeatherRecord[] = [];
  let nasaHourly: Awaited<ReturnType<typeof fetchNasaPowerHourly>> = [];

  if (wantsNasa) {
    [nasaDailyAll, nasaHourly] = await Promise.all([
      fetchNasaPowerDaily(
        latitude,
        longitude,
        `${lastYear}-01-01`,
        endDate
      ),
      need.disease
        ? fetchNasaPowerHourly(latitude, longitude, diseaseStartDate, endDate)
        : Promise.resolve([]),
    ]);
  }

  const forecastHourly = need.disease
    ? extractMetNorwayForecast(metData, 72)
    : [];

  const diseaseRisk = need.disease
    ? computeDiseaseRiskForecast(
        filterDailyByDateRange(nasaDailyAll, diseaseStartDate, endDate),
        nasaHourly,
        forecastHourly
      )
    : computeDiseaseRiskForecast([], [], []);

  let growthPotential: PortalDashboardData["growthPotential"] = {
    year: lastYear,
    monthlyTemperatures: [],
    series: [],
  };

  if (need.growthPotential) {
    const lastYearDaily = nasaDailyAll.filter((row: DailyWeatherRecord) =>
      row.date.startsWith(String(lastYear))
    );
    const { year, monthlyTemperatures } = buildMonthlyAverageTemperatures(
      lastYearDaily,
      lastYear
    );
    growthPotential = {
      year,
      monthlyTemperatures,
      series: buildGpSeriesList(warmGrass, coolGrass, monthlyTemperatures),
    };
  }

  return {
    weather,
    diseaseRisk,
    growthPotential,
    sprayForecast: need.spray ? judge(metData.properties.timeseries) : [],
  };
}
