export type OrchardCropId = "apple" | "nashi";

export type RiskLevel = "low" | "caution" | "high";

export type ModelStatus =
  | "mills"
  | "gdd"
  | "duthie"
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

export interface OrchardRiskForecast {
  cropId: OrchardCropId;
  variety: string;
  varietyFactor: number;
  growthStageId: string;
  /** リクエストで受け取った開花始期（りんご・参照用） */
  bloomStart: string | null;
  /** 緑弁日（りんご黒星・升孢子 GDD）。未設定時は季節窓代理 */
  greenTipDate: string | null;
  weather5d: OrchardDailyWeather[];
  infectionByDiseaseId: Record<string, RiskLevel[]>;
  rationales: Record<string, string>;
  onset: OrchardOnsetRow[];
  modelStatusByDisease: Record<string, ModelStatus>;
  demoDiseaseIds: string[];
  dataSourceLabel: string;
  updatedAt: string;
}
