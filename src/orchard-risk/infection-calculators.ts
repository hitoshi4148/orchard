import { calculateAppleScabRisk } from "../disease/models/apple-scab";
import { DiseaseWeatherInput } from "../disease/types";
import { filterHourlyInWindow } from "../disease/models/risk-utils";
import { isHourWet } from "../disease/wetness";

export interface InfectionCalcResult {
  percent: number | null;
  rationale: string;
}

/** りんご黒星病 — Mills 法（検証済み実装を流用） */
export function calcAppleScab(input: DiseaseWeatherInput): InfectionCalcResult {
  const percent = calculateAppleScabRisk(input);
  if (percent == null) {
    return {
      percent: null,
      rationale:
        "気象データが不足しているため Mills 法による感染危険度を算出できませんでした。",
    };
  }
  return {
    percent,
    rationale: `Mills 法（改訂）と推定葉面濡れに基づく一次感染リスク: ${percent}%（0–100）。`,
  };
}

/** 高温×湿潤の簡易ヒューリスティック（研究モデル未接続の病害向け） */
export function calcWetTempHeuristic(
  input: DiseaseWeatherInput,
  options: {
    tempMin: number;
    tempMax: number;
    diseaseLabel: string;
    wetHoursHigh: number;
    wetHoursCaution: number;
  }
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 48);
  let score = 0;
  let wetInRange = 0;

  for (const row of window) {
    if (!isHourWet(row)) {
      continue;
    }
    const t = row.temperature ?? NaN;
    if (t >= options.tempMin && t <= options.tempMax) {
      wetInRange += 1;
    }
  }

  if (wetInRange >= options.wetHoursHigh) {
    score = 75;
  } else if (wetInRange >= options.wetHoursCaution) {
    score = 48;
  } else if (wetInRange >= 2) {
    score = 22;
  } else {
    score = 8;
  }

  return {
    percent: score,
    rationale: `${options.diseaseLabel}: 直近48hの適温帯（${options.tempMin}–${options.tempMax}℃）における推定濡れ ${wetInRange}h から簡易スコア ${score}%（ヒューリスティック・仮）。`,
  };
}

/**
 * なし黒星病 — Duthie モデル接続前。
 * りんご Mills 表は使用しない。濡れと気温帯のみの暫定指標。
 */
export function calcNashiScabPlaceholder(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const targetMs = new Date(input.targetDateTime).getTime();
  const window = filterHourlyInWindow(input.hourly, targetMs, 72);
  let wetHours = 0;
  let warmWet = 0;

  for (const row of window) {
    if (!isHourWet(row)) {
      continue;
    }
    wetHours += 1;
    const t = row.temperature ?? NaN;
    if (t >= 12 && t <= 22) {
      warmWet += 1;
    }
  }

  if (window.length < 8) {
    return {
      percent: null,
      rationale:
        "なし黒星病: Duthie モデルは未接続。予報データが不足しているため暫定評価を省略しました。",
    };
  }

  const percent = Math.min(
    70,
    Math.round(warmWet * 4 + Math.min(20, wetHours))
  );
  return {
    percent,
    rationale: `なし黒星病: Duthie モデル未接続のため、12–22℃帯の推定濡れ ${warmWet}h のみを暫定表示（${percent}%）。正式予測ではありません。`,
  };
}
