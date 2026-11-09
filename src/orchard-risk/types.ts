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
    leafWetIsEstimated: true;
  } | null;
  marssoninaNasaWindow?: {
    fetchStart: string;
    fetchEnd: string;
    hourlyCount: number;
    requestedDays: number;
  };
}

export interface OrchardRiskForecast {
  cropId: OrchardCropId;
  variety: string;
  varietyFactor: number;
  growthStageId: string;
  /** リクエストで受け取った開花始期（りんご・参照用） */
  bloomStart: string | null;
  weather5d: OrchardDailyWeather[];
  infectionByDiseaseId: Record<string, RiskLevel[]>;
  rationales: Record<string, string>;
  onset: OrchardOnsetRow[];
  modelStatusByDisease: Record<string, ModelStatus>;
  demoDiseaseIds: string[];
  dataSourceLabel: string;
  updatedAt: string;
}
