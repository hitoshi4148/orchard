import { DiseaseWeatherInput } from "../disease/types";
import { calcWetTempHeuristic, InfectionCalcResult } from "./infection-calculators";

/** 簡易モデル — 二次文献・圃場観察メモに基づく閾値（確定予測ではない） */
export interface HeuristicDiseaseParams {
  diseaseLabel: string;
  tempMin: number;
  tempMax: number;
  wetHoursHigh: number;
  wetHoursCaution: number;
  /** UI・根拠文に載せる参照メモ */
  reference: string;
}

export const ORCHARD_HEURISTIC_BY_ID: Record<string, HeuristicDiseaseParams> = {
  "apple:alternaria": {
    diseaseLabel: "りんご斑点落葉病",
    tempMin: 24,
    tempMax: 32,
    wetHoursHigh: 8,
    wetHoursCaution: 4,
    reference:
      "Alternaria mali — 高温期（25–30℃）× 長時間葉面濡れで重症化しやすい（.extension 系レビュー・簡易閾値）。",
  },
  "apple:anthracnose": {
    diseaseLabel: "りんご炭疽病",
    tempMin: 20,
    tempMax: 28,
    wetHoursHigh: 6,
    wetHoursCaution: 3,
    reference:
      "Colletotrichum — 暖湿（20–28℃）・降雨後の湿潤持続が感染の鍵（果実期も含む・ヒューリスティック）。",
  },
  "apple:blotch": {
    diseaseLabel: "りんご輪紋病",
    tempMin: 18,
    tempMax: 26,
    wetHoursHigh: 5,
    wetHoursCaution: 2,
    reference:
      "Botryosphaeria 系 — 輪紋・黒化は満雨季の湿害ストレスと併発しやすい（18–26℃・濡れ持続の代理指標）。",
  },
  "nashi:blotch": {
    diseaseLabel: "なし輪紋病",
    tempMin: 18,
    tempMax: 26,
    wetHoursHigh: 5,
    wetHoursCaution: 2,
    reference:
      "輪紋状病斑 — 多雨・高湿の熟期（18–26℃）に注意（りんご輪紋と同系の簡易扱い）。",
  },
  "nashi:black_spot": {
    diseaseLabel: "なし黒斑病",
    tempMin: 24,
    tempMax: 32,
    wetHoursHigh: 10,
    wetHoursCaution: 5,
    reference:
      "高温多湿（24–32℃）× 長時間濡れ — 夏期の黒斑様症状の警戒用ヒューリスティック。",
  },
  "nashi:anthracnose": {
    diseaseLabel: "なし炭疽病",
    tempMin: 20,
    tempMax: 28,
    wetHoursHigh: 6,
    wetHoursCaution: 3,
    reference:
      "炭疽類 — 暖湿と果実傷・湿潤の併発期（20–28℃）の簡易スコア。",
  },
  "grape:downy_mildew": {
    diseaseLabel: "ぶどうべと病",
    tempMin: 18,
    tempMax: 25,
    wetHoursHigh: 8,
    wetHoursCaution: 4,
    reference:
      "Plasmopara viticola — 18–25℃・夜間高湿・葉面濡れ持続の警戒用（簡易）。",
  },
  "grape:black_rot": {
    diseaseLabel: "ぶどう黒とう病",
    tempMin: 20,
    tempMax: 28,
    wetHoursHigh: 6,
    wetHoursCaution: 3,
    reference: "Guignardia — 降雨期の若組織（新梢・幼果）× 湿潤（簡易）。",
  },
  "grape:late_rot": {
    diseaseLabel: "ぶどう晩腐病",
    tempMin: 22,
    tempMax: 30,
    wetHoursHigh: 5,
    wetHoursCaution: 2,
    reference: "Greeneria 系 — 熟期前後の降雨・果面濡れの警戒用（簡易）。",
  },
  "grape:gray_mold": {
    diseaseLabel: "ぶどう灰色かび病",
    tempMin: 15,
    tempMax: 22,
    wetHoursHigh: 8,
    wetHoursCaution: 4,
    reference: "Botrytis — 開花前後の持続湿潤（15–22℃）の簡易スコア。",
  },
  "grape:anthracnose": {
    diseaseLabel: "ぶどう褐斑病",
    tempMin: 24,
    tempMax: 32,
    wetHoursHigh: 5,
    wetHoursCaution: 2,
    reference: "Elsinoe — 高温多湿・新梢展開期の警戒（簡易）。",
  },
  "peach:bacterial_shot_hole": {
    diseaseLabel: "もも細菌性穿孔病",
    tempMin: 15,
    tempMax: 26,
    wetHoursHigh: 4,
    wetHoursCaution: 2,
    reference:
      "Xanthomonas — 雨滴・霧吹き経由の感染。風は未モデル化（温湿×濡れの代理）。",
  },
  "peach:gray_spot": {
    diseaseLabel: "もも灰色炭疽病",
    tempMin: 20,
    tempMax: 28,
    wetHoursHigh: 6,
    wetHoursCaution: 3,
    reference: "炭疽類 — 暖湿と傷付き葉の警戒用（簡易）。",
  },
  "peach:scab": {
    diseaseLabel: "もも黒星病",
    tempMin: 18,
    tempMax: 24,
    wetHoursHigh: 8,
    wetHoursCaution: 4,
    reference:
      "Cladosporium carpophilum — 展葉〜幼果の湿潤継続（なし黒星とは別病原・簡易）。",
  },
  "peach:leaf_curl": {
    diseaseLabel: "ももいさか病",
    tempMin: 10,
    tempMax: 18,
    wetHoursHigh: 12,
    wetHoursCaution: 6,
    reference: "Taphrina — 早春の低温×長時間濡れ（展葉前後）の警戒用。",
  },
  "peach:anthracnose": {
    diseaseLabel: "もも炭疽病",
    tempMin: 20,
    tempMax: 28,
    wetHoursHigh: 6,
    wetHoursCaution: 3,
    reference: "炭疽類 — 多雨・暖湿期の果実・葉（簡易）。",
  },
};

export interface HeuristicThresholdRow {
  id: string;
  diseaseLabel: string;
  tempMin: number;
  tempMax: number;
  wetHoursCaution: number;
  wetHoursHigh: number;
}

/** docs/heuristic-orchard-diseases.md とテストの単一ソース */
export function listHeuristicThresholdRows(): HeuristicThresholdRow[] {
  return Object.entries(ORCHARD_HEURISTIC_BY_ID).map(([id, p]) => ({
    id,
    diseaseLabel: p.diseaseLabel,
    tempMin: p.tempMin,
    tempMax: p.tempMax,
    wetHoursCaution: p.wetHoursCaution,
    wetHoursHigh: p.wetHoursHigh,
  }));
}

export function calcOrchardHeuristicDisease(
  diseaseId: string,
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const params = ORCHARD_HEURISTIC_BY_ID[diseaseId];
  if (!params) {
    return { percent: null, rationale: "未定義の簡易病害 ID です。" };
  }
  const base = calcWetTempHeuristic(input, params);
  return {
    percent: base.percent,
    rationale: `${base.rationale} 参照: ${params.reference}`,
  };
}
