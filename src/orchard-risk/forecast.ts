import {
  DailyWeatherRecord,
  fetchNasaPowerDaily,
  fetchNasaPowerHourly,
  HourlyWeatherRecord,
} from "../disease/nasa-power";
import {
  addDaysToDateString,
  fetchMetNorwayFromToday,
  jstTodayString,
} from "../disease/met-norway-forecast";
import {
  buildTargetDateTimeJst,
  prepareWeatherAtTarget,
} from "../disease/prepare-data";
import { DiseaseWeatherInput } from "../disease/types";
import {
  DISEASE_DISPLAY_NAME,
  DISEASE_IDS_BY_CROP,
  MODEL_STATUS,
} from "./catalog";
import { buildSixDayWeather } from "./daily-aggregate";
import {
  calcAppleScab,
  calcNashiScabPlaceholder,
  calcWetTempHeuristic,
} from "./infection-calculators";
import {
  calcMarssoninaForecastInfection,
  MarssoninaForecastContext,
} from "./marssonina-forecast-risk";
import { computeMarssoninaGddEstimate } from "./marssonina-gdd";
import {
  fetchMarssoninaExplorationHourly,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "./marssonina-infection";
import {
  buildDemoOnset,
  buildAppleScabOnset,
  buildMarssoninaBloomUnsetOnset,
  buildMarssoninaOnsetFromSearch,
  buildNashiScabOnset,
} from "./onset";
import {
  applyVarietyFactor,
  percentToInfectionLevel,
} from "./risk-level";
import { OrchardCropId, OrchardRiskForecast, RiskLevel } from "./types";
import { getVarietyFactor } from "./variety";

export interface OrchardRiskFetchOptions {
  /** false で NASA 長窓（褐斑 onset）を省略し 6 日表・黒星などを高速化 */
  includeMarssoninaOnset?: boolean;
}

function calculateForDisease(
  diseaseId: string,
  input: DiseaseWeatherInput,
  marssoninaCtx: MarssoninaForecastContext | null
): { percent: number | null; rationale: string } {
  switch (diseaseId) {
    case "apple:scab":
      return calcAppleScab(input);
    case "nashi:scab":
      return calcNashiScabPlaceholder(input);
    case "apple:marssonina":
      return calcMarssoninaForecastInfection(input, marssoninaCtx);
    case "apple:alternaria":
      return calcWetTempHeuristic(input, {
        tempMin: 24,
        tempMax: 32,
        diseaseLabel: "りんご斑点落葉病",
        wetHoursHigh: 8,
        wetHoursCaution: 4,
      });
    case "apple:anthracnose":
      return calcWetTempHeuristic(input, {
        tempMin: 20,
        tempMax: 28,
        diseaseLabel: "りんご炭疽病",
        wetHoursHigh: 6,
        wetHoursCaution: 3,
      });
    case "apple:blotch":
      return calcWetTempHeuristic(input, {
        tempMin: 18,
        tempMax: 26,
        diseaseLabel: "りんご輪紋病",
        wetHoursHigh: 5,
        wetHoursCaution: 2,
      });
    case "nashi:red_spot":
      return calcWetTempHeuristic(input, {
        tempMin: 14,
        tempMax: 22,
        diseaseLabel: "なし赤星病",
        wetHoursHigh: 8,
        wetHoursCaution: 4,
      });
    case "nashi:blotch":
      return calcWetTempHeuristic(input, {
        tempMin: 18,
        tempMax: 26,
        diseaseLabel: "なし輪紋病",
        wetHoursHigh: 5,
        wetHoursCaution: 2,
      });
    case "nashi:black_spot":
      return calcWetTempHeuristic(input, {
        tempMin: 24,
        tempMax: 32,
        diseaseLabel: "なし黒斑病",
        wetHoursHigh: 10,
        wetHoursCaution: 5,
      });
    case "nashi:anthracnose":
      return calcWetTempHeuristic(input, {
        tempMin: 20,
        tempMax: 28,
        diseaseLabel: "なし炭疽病",
        wetHoursHigh: 6,
        wetHoursCaution: 3,
      });
    default:
      return {
        percent: null,
        rationale: "未定義の病害 ID です。",
      };
  }
}

function buildOnsetRows(
  cropId: OrchardCropId,
  bloomStart: string | null,
  marssoninaSearch: ReturnType<typeof searchPrimaryMarssoninaInfection> | null,
  marssoninaGdd: ReturnType<typeof computeMarssoninaGddEstimate> | null
): OrchardRiskForecast["onset"] {
  const ids = DISEASE_IDS_BY_CROP[cropId];
  const rows = [];

  for (const id of ids) {
    if (id === "apple:scab") {
      rows.push(buildAppleScabOnset());
      continue;
    }
    if (id === "apple:marssonina") {
      if (cropId !== "apple" || !bloomStart) {
        rows.push(buildMarssoninaBloomUnsetOnset());
      } else if (marssoninaSearch) {
        rows.push(
          buildMarssoninaOnsetFromSearch(
            bloomStart,
            marssoninaSearch,
            marssoninaGdd
          )
        );
      } else {
        rows.push(buildMarssoninaBloomUnsetOnset());
      }
      continue;
    }
    if (id === "nashi:scab") {
      rows.push(buildNashiScabOnset());
      continue;
    }
    rows.push(buildDemoOnset(id, DISEASE_DISPLAY_NAME[id] ?? id));
  }

  return rows;
}

export async function fetchOrchardRiskForecast(
  lat: number,
  lon: number,
  cropId: OrchardCropId,
  variety: string,
  growthStageId: string,
  bloomStart: string | null = null,
  options: OrchardRiskFetchOptions = {}
): Promise<OrchardRiskForecast> {
  const includeMarssoninaOnset = options.includeMarssoninaOnset !== false;
  const today = jstTodayString();
  const endDate = addDaysToDateString(today, -1);
  const startDate = addDaysToDateString(today, -14);

  let marssoninaWindow = null as ReturnType<
    typeof resolveMarssoninaNasaWindow
  > | null;
  let marssoninaFetchFailed = false;
  let marssoninaGddDailyPromise: Promise<DailyWeatherRecord[] | null> =
    Promise.resolve(null);

  if (cropId === "apple" && bloomStart && includeMarssoninaOnset) {
    marssoninaWindow = resolveMarssoninaNasaWindow(bloomStart, endDate);
    marssoninaGddDailyPromise = fetchNasaPowerDaily(
      lat,
      lon,
      bloomStart,
      endDate
    ).catch(() => null);
  }

  const [
    nasaDaily,
    nasaHourly,
    forecastHourly,
    marssoninaHourlyRaw,
    marssoninaGddDailyPrefetched,
  ] = await Promise.all([
    fetchNasaPowerDaily(lat, lon, startDate, endDate),
    fetchNasaPowerHourly(lat, lon, startDate, endDate),
    fetchMetNorwayFromToday(lat, lon, 168),
    cropId === "apple" && marssoninaWindow && includeMarssoninaOnset
      ? fetchMarssoninaExplorationHourly(lat, lon, marssoninaWindow).catch(
          () => {
            marssoninaFetchFailed = true;
            return [];
          }
        )
      : Promise.resolve(null),
    marssoninaGddDailyPromise,
  ]);

  const marssoninaSearch =
    cropId === "apple" && bloomStart && marssoninaWindow && includeMarssoninaOnset
      ? searchPrimaryMarssoninaInfection(
          marssoninaHourlyRaw ?? [],
          marssoninaWindow,
          marssoninaFetchFailed
        )
      : null;

  let marssoninaGdd = null as ReturnType<
    typeof computeMarssoninaGddEstimate
  > | null;

  if (
    cropId === "apple" &&
    marssoninaSearch?.marssoninaStatus === "primary_infection_estimated" &&
    marssoninaSearch.primary
  ) {
    const primaryStartDate = marssoninaSearch.primary.infectionDate;
    try {
      let gddDaily = marssoninaGddDailyPrefetched;
      if (gddDaily) {
        gddDaily = gddDaily.filter(
          (row) =>
            row.date >= primaryStartDate && row.date <= endDate
        );
      } else {
        gddDaily = await fetchNasaPowerDaily(
          lat,
          lon,
          primaryStartDate,
          endDate
        );
      }
      marssoninaGdd = computeMarssoninaGddEstimate(
        primaryStartDate,
        gddDaily,
        forecastHourly,
        endDate,
        today
      );
    } catch {
      marssoninaGdd = null;
    }
  }

  const weather5d = buildSixDayWeather(forecastHourly);
  const varietyFactor = getVarietyFactor(cropId, variety);
  const diseaseIds = DISEASE_IDS_BY_CROP[cropId];

  const marssoninaCtx: MarssoninaForecastContext | null =
    marssoninaSearch?.primary?.infectionDate
      ? {
          primaryInfectionDate: marssoninaSearch.primary.infectionDate,
          totalGddDayC: marssoninaGdd?.totalGddThroughForecastDayC ?? null,
        }
      : null;

  const infectionByDiseaseId: Record<string, RiskLevel[]> = {};
  const rationales: Record<string, string> = {};
  const modelStatusByDisease: OrchardRiskForecast["modelStatusByDisease"] = {};
  const demoDiseaseIds: string[] = [];

  for (const diseaseId of diseaseIds) {
    const levels: RiskLevel[] = [];
    let lastRationale = "";

    const marssoninaLive =
      diseaseId === "apple:marssonina" &&
      marssoninaCtx?.primaryInfectionDate != null;
    modelStatusByDisease[diseaseId] = marssoninaLive
      ? "gdd"
      : MODEL_STATUS[diseaseId] ?? "demo";

    for (let offset = 0; offset <= 5; offset += 1) {
      const target = buildTargetDateTimeJst(offset, 18);
      const input = prepareWeatherAtTarget(
        nasaDaily,
        nasaHourly,
        forecastHourly,
        target
      );
      const raw = calculateForDisease(diseaseId, input, marssoninaCtx);
      const adjusted = applyVarietyFactor(raw.percent, varietyFactor);
      const level = percentToInfectionLevel(adjusted) ?? "low";
      levels.push(level);
      lastRationale = raw.rationale;

      if (
        MODEL_STATUS[diseaseId] === "heuristic" ||
        (diseaseId === "nashi:scab" && MODEL_STATUS[diseaseId] === "duthie")
      ) {
        if (!demoDiseaseIds.includes(diseaseId)) {
          // nashi scab placeholder is not full demo but duthie incomplete
        }
      }
    }

    if (MODEL_STATUS[diseaseId] === "heuristic" && !marssoninaLive) {
      demoDiseaseIds.push(diseaseId);
    }
    if (diseaseId === "nashi:scab") {
      demoDiseaseIds.push(diseaseId);
    }

    infectionByDiseaseId[diseaseId] = levels;
    rationales[diseaseId] = `${lastRationale}${
      varietyFactor !== 1
        ? ` 品種係数 ${variety}×${varietyFactor.toFixed(2)} を適用。`
        : ""
    }`;
  }

  const updatedAt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const cropLabel = cropId === "nashi" ? "なし" : "りんご";
  const demoNote =
    demoDiseaseIds.length > 0
      ? `（一部病害は簡易／未接続モデル）`
      : "";

  return {
    cropId,
    variety,
    varietyFactor,
    growthStageId,
    bloomStart: cropId === "apple" ? bloomStart : null,
    weather5d,
    infectionByDiseaseId,
    rationales,
    onset: buildOnsetRows(
      cropId,
      cropId === "apple" ? bloomStart : null,
      marssoninaSearch,
      marssoninaGdd
    ),
    modelStatusByDisease,
    demoDiseaseIds,
    dataSourceLabel: `MET Norway 予報 + NASA POWER 履歴（${cropLabel}${demoNote}）`,
    updatedAt,
  };
}
