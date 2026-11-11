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
import { buildCropDiseaseOnsetFromWeather } from "./crop-latency-onset";
import { buildSixDayWeather } from "./daily-aggregate";
import {
  calcAppleScab,
  calcNashiRedSpot,
  calcNashiScab,
} from "./infection-calculators";
import {
  calcMarssoninaForecastInfection,
  MarssoninaForecastContext,
} from "./marssonina-forecast-risk";
import {
  computeMarssoninaGddEstimate,
  marssoninaGddThroughDate,
} from "./marssonina-gdd";
import {
  fetchMarssoninaExplorationHourly,
  resolveMarssoninaNasaWindow,
  searchPrimaryMarssoninaInfection,
} from "./marssonina-infection";
import {
  buildDemoOnset,
  buildHeuristicOnsetFromInfection,
  buildAppleScabOnsetFromHourly,
  buildMarssoninaBloomUnsetOnset,
  buildMarssoninaOnsetDeferredRow,
  buildMarssoninaOnsetFromSearch,
  buildNashiScabOnsetFromHourly,
} from "./onset";
import {
  applyVarietyFactor,
  percentToInfectionLevel,
} from "./risk-level";
import {
  OrchardCropId,
  OrchardDailyWeather,
  OrchardRiskForecast,
  RiskLevel,
} from "./types";
import { getCropVarietyFactor, getDiseaseVarietyFactor } from "./variety";
import {
  calcAppleAlternaria,
  calcAppleAnthracnose,
  calcAppleBlotch,
} from "./diseases/apple-secondary";
import {
  calcNashiAnthracnose,
  calcNashiBlackSpot,
  calcNashiBlotch,
} from "./diseases/nashi-secondary";
import { calcGrapeDisease } from "./diseases/grape-models";
import { calcPeachDisease } from "./diseases/peach-models";
import { resolveAppleScabBiofix } from "./apple-scab-ascospore-gdd";
import {
  ascosporePoolAtDate,
  buildAscosporePoolSnapshots,
  computeAscosporePoolCarryInFromDaily,
  depletedAscosporePoolMap,
} from "./apple-scab-ascospore-season-pool";
import { evaluateAppleScabPrimarySeason } from "./apple-scab-season";
import {
  scabInoculumInitialPoolPercent,
  type ScabInoculumLevel,
} from "./parse-ascospore-inoculum";
import { type PriorYearStatus } from "./parse-prior-year-status";
import {
  adjustLevelForPriorYear,
  priorYearRationaleSuffix,
  priorYearSummaryLabel,
} from "./prior-year-infection";

export interface OrchardRiskFetchOptions {
  /** false で NASA 長窓（褐斑 onset）を省略し 6 日表・黒星などを高速化 */
  includeMarssoninaOnset?: boolean;
  /** りんご黒星・升孢子 GDD のバイオフィックス（緑期日 YYYY-MM-DD） */
  greenTipDate?: string | null;
  /** なし赤星 — 中間宿主（ビャクシン類）が圃場近傍にあるか */
  gymnosporangiumHostNearby?: boolean | null;
  /** りんご黒星 — 圃場残病葉量（枯渇プール初期値） */
  scabInoculumLevel?: ScabInoculumLevel | null;
  /** もも — 昨年発生状況 */
  priorYearStatus?: PriorYearStatus | null;
}

/** 枯渇プール用 hourly の最大遡及日数（Pages Worker CPU 上限対策） */
const APPLE_SCAB_POOL_HOURLY_LOOKBACK_DAYS = 75;

function calculateForDisease(
  diseaseId: string,
  input: DiseaseWeatherInput,
  marssoninaCtx: MarssoninaForecastContext | null,
  appleScabCtx: {
    lat: number;
    lon: number;
    growthStageId: string;
    ascosporeGddDaily?: DailyWeatherRecord[];
    greenTipDate?: string | null;
  },
  nashiRedSpotCtx: { gymnosporangiumHostNearby: boolean | null }
): { percent: number | null; rationale: string } {
  switch (diseaseId) {
    case "apple:scab":
      return calcAppleScab(input, appleScabCtx);
    case "nashi:scab":
      return calcNashiScab(input);
    case "nashi:red_spot":
      return calcNashiRedSpot(input, nashiRedSpotCtx);
    case "apple:marssonina":
      return calcMarssoninaForecastInfection(input, marssoninaCtx);
    case "apple:alternaria":
      return calcAppleAlternaria(input);
    case "apple:anthracnose":
      return calcAppleAnthracnose(input);
    case "apple:blotch":
      return calcAppleBlotch(input);
    case "nashi:blotch":
      return calcNashiBlotch(input);
    case "nashi:black_spot":
      return calcNashiBlackSpot(input);
    case "nashi:anthracnose":
      return calcNashiAnthracnose(input);
    case "grape:downy_mildew":
    case "grape:black_rot":
    case "grape:late_rot":
    case "grape:gray_mold":
    case "grape:anthracnose":
      return calcGrapeDisease(diseaseId, input, { growthStageId });
    case "peach:bacterial_shot_hole":
    case "peach:gray_spot":
    case "peach:scab":
    case "peach:leaf_curl":
    case "peach:anthracnose":
      return calcPeachDisease(diseaseId, input, { growthStageId });
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
  marssoninaGdd: ReturnType<typeof computeMarssoninaGddEstimate> | null,
  hourlyForOnset: import("../disease/nasa-power").HourlyWeatherRecord[],
  onsetTargetDateTime: string,
  infectionByDiseaseId: Record<string, RiskLevel[]>,
  weather5d: OrchardDailyWeather[],
  lat: number,
  lon: number,
  growthStageId: string,
  ascosporeGddDaily: DailyWeatherRecord[] | null,
  greenTipDate: string | null,
  ascosporePoolSnapshots: Map<
    string,
    import("./apple-scab-ascospore-season-pool").AscosporePoolSnapshot
  > | null,
  ascosporePoolInitialPercent: number
): OrchardRiskForecast["onset"] {
  const ids = DISEASE_IDS_BY_CROP[cropId];
  const rows = [];

  for (const id of ids) {
    if (id === "apple:scab") {
      rows.push(
        buildAppleScabOnsetFromHourly(
          hourlyForOnset,
          onsetTargetDateTime,
          lat,
          lon,
          growthStageId,
          ascosporeGddDaily,
          greenTipDate,
          ascosporePoolSnapshots,
          ascosporePoolInitialPercent
        )
      );
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
        rows.push(buildMarssoninaOnsetDeferredRow(bloomStart));
      }
      continue;
    }
    if (id === "nashi:scab") {
      rows.push(
        buildNashiScabOnsetFromHourly(hourlyForOnset, onsetTargetDateTime)
      );
      continue;
    }
    const levels = infectionByDiseaseId[id];
    const status = MODEL_STATUS[id] ?? "demo";
    if (
      (cropId === "grape" || cropId === "peach") &&
      (status === "seasonal" || status === "heuristic") &&
      levels?.length
    ) {
      rows.push(
        buildCropDiseaseOnsetFromWeather(
          id,
          DISEASE_DISPLAY_NAME[id] ?? id,
          levels,
          weather5d
        )
      );
      continue;
    }
    if (
      (status === "heuristic" ||
        status === "seasonal" ||
        status === "gymnosporangium") &&
      levels?.length
    ) {
      rows.push(
        buildHeuristicOnsetFromInfection(
          id,
          DISEASE_DISPLAY_NAME[id] ?? id,
          levels,
          { modelStatus: status, connected: true }
        )
      );
    } else {
      rows.push(buildDemoOnset(id, DISEASE_DISPLAY_NAME[id] ?? id));
    }
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
  const greenTipDate = options.greenTipDate ?? null;
  const gymnosporangiumHostNearby =
    options.gymnosporangiumHostNearby ?? null;
  const scabInoculumLevel =
    cropId === "apple"
      ? (options.scabInoculumLevel ?? "normal")
      : null;
  const priorYearStatus =
    cropId === "peach" ? (options.priorYearStatus ?? null) : null;
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

  let appleScabGddDailyPromise: Promise<DailyWeatherRecord[] | null> =
    Promise.resolve(null);
  let appleScabSeasonHourlyPromise: Promise<
    import("../disease/nasa-power").HourlyWeatherRecord[] | null
  > = Promise.resolve(null);
  let appleScabBiofixForPool: ReturnType<typeof resolveAppleScabBiofix> | null =
    null;
  let appleScabUseDepletedPool = false;
  let appleScabPoolHourlyFrom: string | null = null;
  if (cropId === "apple") {
    appleScabBiofixForPool = resolveAppleScabBiofix(
      lat,
      lon,
      `${today}T12:00:00+09:00`,
      greenTipDate
    );
    const biofix = appleScabBiofixForPool.date;
    const scabSeasonNow = evaluateAppleScabPrimarySeason(
      lat,
      `${today}T12:00:00+09:00`,
      growthStageId,
      lon
    );
    if (!scabSeasonNow.inPrimarySeason) {
      appleScabUseDepletedPool = true;
    }
    if (biofix <= endDate) {
      appleScabGddDailyPromise = fetchNasaPowerDaily(
        lat,
        lon,
        biofix,
        endDate
      ).catch(() => null);
      if (!appleScabUseDepletedPool) {
        const poolHourlyStart = addDaysToDateString(
          endDate,
          -(APPLE_SCAB_POOL_HOURLY_LOOKBACK_DAYS - 1)
        );
        const hourlyFrom =
          poolHourlyStart > biofix ? poolHourlyStart : biofix;
        appleScabPoolHourlyFrom = hourlyFrom;
        appleScabSeasonHourlyPromise = fetchNasaPowerHourly(
          lat,
          lon,
          hourlyFrom,
          endDate
        ).catch(() => null);
      }
    }
  }

  const [
    nasaDaily,
    nasaHourly,
    forecastHourly,
    marssoninaHourlyRaw,
    marssoninaGddDailyPrefetched,
    appleScabGddDaily,
    appleScabSeasonHourly,
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
    appleScabGddDailyPromise,
    appleScabSeasonHourlyPromise,
  ]);

  const poolInitialPercent = scabInoculumInitialPoolPercent(
    scabInoculumLevel ?? "normal"
  );
  const appleScabPoolCarryIn =
    cropId === "apple" &&
    appleScabBiofixForPool &&
    !appleScabUseDepletedPool &&
    appleScabGddDaily?.length &&
    appleScabPoolHourlyFrom &&
    appleScabPoolHourlyFrom > appleScabBiofixForPool.date
      ? {
          windowStartDate: appleScabPoolHourlyFrom,
          ...computeAscosporePoolCarryInFromDaily(
            appleScabBiofixForPool.date,
            appleScabBiofixForPool.source,
            appleScabGddDaily,
            addDaysToDateString(appleScabPoolHourlyFrom, -1),
            poolInitialPercent
          ),
        }
      : undefined;
  const appleScabPoolSnapshots =
    cropId === "apple" && appleScabBiofixForPool
      ? appleScabUseDepletedPool
        ? depletedAscosporePoolMap(endDate, poolInitialPercent)
        : appleScabGddDaily?.length &&
            (appleScabSeasonHourly?.length || forecastHourly.length)
          ? buildAscosporePoolSnapshots(
              appleScabBiofixForPool.date,
              appleScabBiofixForPool.source,
              appleScabGddDaily,
              [...(appleScabSeasonHourly ?? []), ...forecastHourly],
              poolInitialPercent,
              appleScabPoolCarryIn
            )
          : null
      : null;

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
  const varietyFactor = getCropVarietyFactor(cropId, variety);
  const diseaseIds = DISEASE_IDS_BY_CROP[cropId];

  const marssoninaPrimary = marssoninaSearch?.primary?.infectionDate ?? null;
  const marssoninaCtx: MarssoninaForecastContext | null = marssoninaPrimary
    ? {
        primaryInfectionDate: marssoninaPrimary,
        totalGddDayC: marssoninaGdd?.totalGddThroughForecastDayC ?? null,
        gddThroughTargetYmd: (targetYmd) =>
          marssoninaGddThroughDate(
            marssoninaPrimary,
            targetYmd,
            nasaDaily,
            forecastHourly,
            endDate,
            today
          ),
      }
    : null;

  if (marssoninaCtx?.gddThroughTargetYmd) {
    for (const day of weather5d) {
      day.marssoninaGddDayC = marssoninaCtx.gddThroughTargetYmd(day.date);
    }
  }

  const ascosporePoolInitialPercent =
    cropId === "apple"
      ? scabInoculumInitialPoolPercent(scabInoculumLevel ?? "normal")
      : 100;
  const onsetTargetDateTime = buildTargetDateTimeJst(0, 18);
  const ascosporePoolToday =
    cropId === "apple" && appleScabPoolSnapshots
      ? ascosporePoolAtDate(appleScabPoolSnapshots, onsetTargetDateTime)
      : null;

  const infectionByDiseaseId: Record<string, RiskLevel[]> = {};
  const rationales: Record<string, string> = {};
  const modelStatusByDisease: OrchardRiskForecast["modelStatusByDisease"] = {};
  const demoDiseaseIds: string[] = [];

  for (const diseaseId of diseaseIds) {
    const levels: RiskLevel[] = [];
    let lastRationale = "";

    modelStatusByDisease[diseaseId] = MODEL_STATUS[diseaseId] ?? "demo";

    for (let offset = 0; offset <= 5; offset += 1) {
      const target = buildTargetDateTimeJst(offset, 18);
      const input = prepareWeatherAtTarget(
        nasaDaily,
        nasaHourly,
        forecastHourly,
        target
      );
      const raw = calculateForDisease(
        diseaseId,
        input,
        marssoninaCtx,
        {
          lat,
          lon,
          growthStageId,
          ascosporeGddDaily: appleScabGddDaily ?? undefined,
          greenTipDate,
          ascosporePoolSnapshots: appleScabPoolSnapshots ?? undefined,
          ascosporePoolInitialPercent:
            cropId === "apple" ? ascosporePoolInitialPercent : undefined,
        },
        { gymnosporangiumHostNearby }
      );
      const diseaseFactor = getDiseaseVarietyFactor(cropId, variety, diseaseId);
      const adjusted = applyVarietyFactor(raw.percent, diseaseFactor);
      const baseLevel = percentToInfectionLevel(adjusted) ?? "low";
      const level =
        cropId === "peach" && priorYearStatus
          ? adjustLevelForPriorYear(baseLevel, priorYearStatus, diseaseId)
          : baseLevel;
      levels.push(level);
      lastRationale = raw.rationale;
      if (diseaseFactor !== 1) {
        lastRationale += ` 品種「${variety}」×${diseaseFactor.toFixed(2)} を適用。`;
      }

      if (
        MODEL_STATUS[diseaseId] === "heuristic" ||
        (diseaseId === "nashi:scab" && MODEL_STATUS[diseaseId] === "duthie")
      ) {
        if (!demoDiseaseIds.includes(diseaseId)) {
          // nashi scab placeholder is not full demo but duthie incomplete
        }
      }
    }

    if (MODEL_STATUS[diseaseId] === "heuristic") {
      demoDiseaseIds.push(diseaseId);
    }

    infectionByDiseaseId[diseaseId] = levels;
    rationales[diseaseId] =
      lastRationale + priorYearRationaleSuffix(priorYearStatus, diseaseId);
  }

  const updatedAt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const cropLabels: Record<OrchardCropId, string> = {
    apple: "りんご",
    nashi: "なし",
    grape: "ぶどう",
    peach: "もも",
  };
  const cropLabel = cropLabels[cropId];
  const demoNote =
    demoDiseaseIds.length > 0
      ? `（一部病害は警戒の目安）`
      : "";

  return {
    cropId,
    variety,
    varietyFactor,
    growthStageId,
    bloomStart: cropId === "apple" ? bloomStart : null,
    greenTipDate: cropId === "apple" ? greenTipDate : null,
    scabInoculumLevel:
      cropId === "apple" ? (scabInoculumLevel ?? "normal") : null,
    ascosporePool:
      ascosporePoolToday != null
        ? {
            date: ascosporePoolToday.date,
            remainingPercent: ascosporePoolToday.remainingPercent,
            cumulativeReleasedPercent:
              ascosporePoolToday.cumulativeReleasedPercent,
            rainEventsProcessed: ascosporePoolToday.rainEventsProcessed,
            initialPoolPercent: ascosporePoolInitialPercent,
            hourlyWindowStart: appleScabUseDepletedPool
              ? ascosporePoolToday.date
              : (appleScabPoolHourlyFrom ??
                appleScabBiofixForPool?.date ??
                null),
            dailyCarryInApplied: Boolean(appleScabPoolCarryIn),
            offSeasonDepletedShortcut: appleScabUseDepletedPool,
          }
        : cropId === "apple"
          ? null
          : null,
    gymnosporangiumHostNearby:
      cropId === "nashi" ? gymnosporangiumHostNearby : null,
    priorYearStatus: cropId === "peach" ? priorYearStatus : null,
    priorYearInfectionNote:
      cropId === "peach" ? priorYearSummaryLabel(priorYearStatus) : null,
    weather5d,
    infectionByDiseaseId,
    rationales,
    onset: buildOnsetRows(
      cropId,
      cropId === "apple" ? bloomStart : null,
      marssoninaSearch,
      marssoninaGdd,
      prepareWeatherAtTarget(
        nasaDaily,
        nasaHourly,
        forecastHourly,
        buildTargetDateTimeJst(0, 18)
      ).hourly,
      buildTargetDateTimeJst(0, 18),
      infectionByDiseaseId,
      weather5d,
      lat,
      lon,
      growthStageId,
      appleScabGddDaily,
      greenTipDate,
      appleScabPoolSnapshots,
      ascosporePoolInitialPercent
    ),
    modelStatusByDisease,
    demoDiseaseIds,
    dataSourceLabel: `MET Norway 予報 + NASA POWER 履歴（${cropLabel}${demoNote}）`,
    updatedAt,
  };
}
