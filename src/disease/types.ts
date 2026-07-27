import { DailyWeatherRecord, HourlyWeatherRecord } from "./nasa-power";

export interface DiseaseRiskResult {
  dollarSpot: number | null;
  brownPatch: number | null;
  pythium: number | null;
  anthracnose: number | null;
  largePatch: number | null;
}

export type DiseaseRiskKey = keyof DiseaseRiskResult;

export interface DiseaseWeatherInput {
  daily: DailyWeatherRecord[];
  hourly: HourlyWeatherRecord[];
  targetDateTime: string;
}

export interface DiseaseModelDefinition {
  key: DiseaseRiskKey;
  displayName: string;
  description: string;
  calculate: (input: DiseaseWeatherInput) => number | null;
}

export interface WetPeriod {
  startDateTime: string;
  endDateTime: string;
  durationHours: number;
  averageTemperature: number;
  wetHours: HourlyWeatherRecord[];
}

export interface MillsInfectionEvent {
  wetPeriod: WetPeriod;
  requiredHours: number;
  severityRatio: number;
  endMs: number;
}
