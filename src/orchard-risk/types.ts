export type OrchardCropId = "apple" | "nashi";

export type RiskLevel = "low" | "caution" | "high";

export type ModelStatus =
  | "mills"
  | "gdd"
  | "duthie"
  | "heuristic"
  | "demo";

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
}

export interface OrchardRiskForecast {
  cropId: OrchardCropId;
  variety: string;
  varietyFactor: number;
  growthStageId: string;
  weather5d: OrchardDailyWeather[];
  infectionByDiseaseId: Record<string, RiskLevel[]>;
  rationales: Record<string, string>;
  onset: OrchardOnsetRow[];
  modelStatusByDisease: Record<string, ModelStatus>;
  demoDiseaseIds: string[];
  dataSourceLabel: string;
  updatedAt: string;
}
