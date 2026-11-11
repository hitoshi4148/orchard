import { calculateAppleScabRisk } from "../disease/models/apple-scab";
import { calculateAppleCedarRustRisk } from "../disease/models/apple-cedar-rust";
import {
  computeAppleScabAscosporeMaturity,
  resolveAppleScabBiofix,
} from "./apple-scab-ascospore-gdd";
import { evaluateAppleScabPrimarySeason } from "./apple-scab-season";
import { DailyWeatherRecord } from "../disease/nasa-power";
import { calculateNashiScabIshiiRisk } from "./nashi-scab-ishii";
import { DiseaseWeatherInput } from "../disease/types";
import { filterHourlyInWindow } from "../disease/models/risk-utils";
import { isHourWet } from "../disease/wetness";

export interface InfectionCalcResult {
  percent: number | null;
  rationale: string;
}

export interface OrchardAppleScabContext {
  lat: number;
  lon?: number;
  growthStageId: string;
  ascosporeGddDaily?: DailyWeatherRecord[];
  greenTipDate?: string | null;
}

/** りんご黒星病 — Mills 法 + 季節窓 + MacHardy 系升孢子 GDD */
export function calcAppleScab(
  input: DiseaseWeatherInput,
  ctx?: OrchardAppleScabContext
): InfectionCalcResult {
  if (ctx) {
    const season = evaluateAppleScabPrimarySeason(
      ctx.lat,
      input.targetDateTime,
      ctx.growthStageId,
      ctx.lon
    );
    if (!season.inPrimarySeason) {
      return {
        percent: 4,
        rationale: `りんご黒星病: ${season.reason} Mills 感染危険は低く表示（4%）。`,
      };
    }
  }

  const millsPercent = calculateAppleScabRisk(input);
  if (millsPercent == null) {
    return {
      percent: null,
      rationale:
        "気象データが不足しているため Mills 法による感染危険度を算出できませんでした。",
    };
  }

  const seasonNote = ctx
    ? evaluateAppleScabPrimarySeason(
        ctx.lat,
        input.targetDateTime,
        ctx.growthStageId,
        ctx.lon
      ).reason
    : "";

  let percent = millsPercent;
  let ascosporeNote = "";
  if (
    ctx?.ascosporeGddDaily?.length &&
    input.hourly?.length
  ) {
    const biofix = resolveAppleScabBiofix(
      ctx.lat,
      ctx.lon,
      input.targetDateTime,
      ctx.greenTipDate
    );
    const maturity = computeAppleScabAscosporeMaturity(
      biofix.date,
      input.targetDateTime,
      ctx.ascosporeGddDaily,
      input.hourly,
      biofix.source
    );
    ascosporeNote = maturity.summary;
    if (maturity.maturityPercent < 3) {
      return {
        percent: 4,
        rationale: `りんご黒星病: ${ascosporeNote} Mills 条件が揃っても升孢子未成熟のため低リスク（4%）。${seasonNote ? ` ${seasonNote}` : ""}`,
      };
    }
    percent = Math.min(
      100,
      Math.max(
        0,
        Math.round((millsPercent * maturity.maturityPercent) / 100)
      )
    );
  }

  return {
    percent,
    rationale: `Mills 法（改訂）×升孢子成熟率の一次感染リスク: ${percent}%（Mills素点 ${millsPercent}%）。${ascosporeNote ? ` ${ascosporeNote}` : ""}${seasonNote ? ` ${seasonNote}` : ""}`,
  };
}

/** なし赤星病 — 春季降雨×濡れ（Gymnosporangium、ビャクシン未考慮） */
export function calcNashiRedSpot(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const percent = calculateAppleCedarRustRisk(input);
  if (percent == null) {
    return {
      percent: null,
      rationale:
        "なし赤星病: 気象データが不足しているため春季感染リスクを算出できませんでした。",
    };
  }
  return {
    percent,
    rationale:
      `なし赤星病: 春季降雨・濡れ継続モデル（Gymnosporangium・4–5月季節係数）: ${percent}%（0–100）。` +
      " 中間宿主（ビャクシン類）の圃場内外は未反映 — ビャクシンが近くに無い場合は実リスクはより低くなります。",
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
/** なし黒星 — Ishii & Yanase (2003) 最小濡れ L(T)（Duthie 動的モデル前段） */
export function calcNashiScab(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const percent = calculateNashiScabIshiiRisk(input);
  if (percent == null) {
    return {
      percent: null,
      rationale:
        "なし黒星病: 気象データが不足しているため Ishii & Yanase 最小濡れモデルを算出できませんでした。",
    };
  }
  return {
    percent,
    rationale: `なし黒星病（V. nashicola）: Ishii & Yanase (2003) の温度別最小濡れ時間と推定葉面濡れ期間から感染危険 ${percent}%（0–100）。Duthie (2007) 動的モデルは未接続。`,
  };
}
