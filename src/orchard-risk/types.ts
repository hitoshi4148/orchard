import type { ScabInoculumLevel } from "./parse-ascospore-inoculum";

export type OrchardCropId = "apple" | "nashi" | "grape" | "peach";

export type RiskLevel = "low" | "caution" | "high";

export type ModelStatus =
  | "mills"
  | "gdd"
  | "duthie"
  | "gymnosporangium"
  | "heuristic"
  | "demo";

/** 褐斑発病予測の状態（v0.2）。P2 以降で拡張 */
export type MarssoninaOnsetStatus =
  | "bloom_date_unset"
  | "onset_pending_model"
  | "primary_infection_estimated"
  | "partial_infection_reference"
  | "insufficient_weather"
  | "insufficient_weather_coverage"
  | "no_infection_event"
  | "not_applicable"
  | "onset_already_passed"
  | "onset_within_forecast"
  | "onset_beyond_forecast";

export interface MarssoninaOnsetContext {
  /** YYYY-MM-DD。りんご・褐斑発病で必須（未設定時は計算しない） */
  bloomStart: string | null;
  growthStageId: string;
  cropId: OrchardCropId;
  variety: string;
}

export interface OrchardDailyWeather {
  dayOffset: number;
  label: string;
  date: string;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  precipMm: number;
  humidityPct: number;
  leafWetHours: number;
  leafWetIsEstimated: true;
  /** りんご褐斑 — 一次感染後の積算 GDD（日℃）。未接続時は undefined */
  marssoninaGddDayC?: number | null;
}

export interface OrchardOnsetRow {
  diseaseId: string;
  estimatedInfectionDate: string;
  gddSinceInfectionDayC: number | null;
  predictedOnsetWindow: string;
  confidence: "高" | "中" | "低";
  note: string;
  modelStatus: ModelStatus;
  isDemo: boolean;
  /** 褐斑（apple:marssonina）のみ */
  marssoninaStatus?: MarssoninaOnsetStatus;
  bloomStart?: string | null;
  weatherCoverage?: "full" | "partial";
  primaryInfection?: {
    infectionDate: string;
    periodStart: string;
    periodEnd: string;
    wetDurationHours: number;
    wetAvgTempC: number;
    precipWetHourCount?: number;
    missingHourCount?: number;
    wetnessRule?: string;
    weatherSource?: string;
    leafWetIsEstimated: true;
  } | null;
  marssoninaNasaWindow?: {
    fetchStart: string;
    fetchEnd: string;
    hourlyCount: number;
    requestedDays: number;
  };
  marssoninaGdd?: {
    gddStartDate: string;
    gddStartAssumption: string;
    baseTempC: number;
    thresholdDayC: number;
    measuredGddDayC: number;
    forecastGddDayC: number;
    totalGddThroughForecastDayC: number;
    missingDailyCount: number;
    measuredPeriodStart: string;
    measuredPeriodEnd: string;
    forecastPeriodStart: string | null;
    forecastPeriodEnd: string | null;
    thresholdStatusLabel: string;
    estimatedOnsetDate: string | null;
    onsetSource: "measured" | "forecast" | null;
    dataQuality: "full" | "degraded" | "insufficient";
    modelConfidence: "低" | "中";
  };
  dataQuality?: "full" | "degraded" | "insufficient";
  modelConfidence?: "低" | "中";
}

export interface OrchardAscosporePoolStatus {
  date: string;
  remainingPercent: number;
  cumulativeReleasedPercent: number;
  rainEventsProcessed: number;
  initialPoolPercent: number;
  /** 時別枯渇プール再生の開始日（JST） */
  hourlyWindowStart?: string | null;
  /** 75日窓より前を日降水で繰り越した */
  dailyCarryInApplied?: boolean;
  /** 一次季節外の枯渇済み近似（Worker CPU 対策） */
  offSeasonDepletedShortcut?: boolean;
}

export interface OrchardRiskForecast {
  cropId: OrchardCropId;
  variety: string;
  varietyFactor: number;
  growthStageId: string;
  /** リクエストで受け取った開花始期（りんご・参照用） */
  bloomStart: string | null;
  /** 緑期日（green tip・りんご黒星升孢子 GDD）。未設定時は季節窓代理 */
  greenTipDate: string | null;
  /** りんご黒星 — 残病葉量（枯渇プール初期）。なし作物は null */
  scabInoculumLevel: ScabInoculumLevel | null;
  /** りんご黒星 — 評価日時点の升孢子枯渇プール（りんごのみ） */
  ascosporePool: OrchardAscosporePoolStatus | null;
  /** なし赤星 — 中間宿主（ビャクシン類）の圃場近傍。未設定は null */
  gymnosporangiumHostNearby: boolean | null;
  weather5d: OrchardDailyWeather[];
  infectionByDiseaseId: Record<string, RiskLevel[]>;
  rationales: Record<string, string>;
  onset: OrchardOnsetRow[];
  modelStatusByDisease: Record<string, ModelStatus>;
  demoDiseaseIds: string[];
  dataSourceLabel: string;
  updatedAt: string;
}
