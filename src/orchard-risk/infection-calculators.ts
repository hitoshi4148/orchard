import { calculateAppleScabRisk } from "../disease/models/apple-scab";
import { calculateAppleCedarRustRisk } from "../disease/models/apple-cedar-rust";
import {
  APPLE_SCAB_ASCOSPORE_DEPLETION_GDD,
  computeAppleScabAscosporeMaturity,
  resolveAppleScabBiofix,
} from "./apple-scab-ascospore-gdd";
import {
  ascosporeReleaseFactorAfterDepletion,
  computeAppleScabConidialRisk,
} from "./apple-scab-conidia";
import { computeAscosporeRainDischargeFactor } from "./apple-scab-ascospore-rain-release";
import {
  ascosporePoolAtDate,
  formatAscosporePoolSummary,
  type AscosporePoolSnapshot,
} from "./apple-scab-ascospore-season-pool";
import { ascosporePoolSupplyFactor } from "./parse-ascospore-inoculum";
import { evaluateAppleScabPrimarySeason } from "./apple-scab-season";
import { DailyWeatherRecord } from "../disease/nasa-power";
import { calculateNashiScabDuthieRisk } from "./nashi-scab-duthie";
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
  /** 降雨累積によるシーズン枯渇プール（日次スナップショット） */
  ascosporePoolSnapshots?: Map<string, AscosporePoolSnapshot>;
  /** 残病葉設定に応じたプール初期値（%） */
  ascosporePoolInitialPercent?: number;
}

/** りんご黒星病 — Mills 法 + 季節窓 + MacHardy 系子囊孢子 GDD */
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

  let ascosporePercent = millsPercent;
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
    const depletionFactor =
      maturity.gddDayC >= APPLE_SCAB_ASCOSPORE_DEPLETION_GDD * 0.87
        ? ascosporeReleaseFactorAfterDepletion(maturity.gddDayC)
        : 1;
    const rainDischarge = computeAscosporeRainDischargeFactor(
      input.hourly,
      input.targetDateTime
    );
    const poolSnap = ascosporePoolAtDate(
      ctx.ascosporePoolSnapshots,
      input.targetDateTime
    );
    const poolCap = ctx.ascosporePoolInitialPercent ?? 100;
    const poolFactor = poolSnap
      ? ascosporePoolSupplyFactor(poolSnap.remainingPercent, poolCap)
      : 1;
    const supplyPercent = Math.min(
      100,
      Math.max(
        0,
        maturity.maturityPercent *
          depletionFactor *
          rainDischarge.releaseFactor *
          poolFactor
      )
    );
    const effectiveMaturity = supplyPercent;
    if (maturity.maturityPercent < 3) {
      ascosporePercent = 4;
    } else if (effectiveMaturity < 2) {
      ascosporePercent = 4;
    } else {
      ascosporePercent = Math.min(
        100,
        Math.max(
          0,
          Math.round((millsPercent * effectiveMaturity) / 100)
        )
      );
    }
    ascosporeNote += ` ${rainDischarge.summary}`;
    const poolNote = formatAscosporePoolSummary(poolSnap);
    if (poolNote) {
      ascosporeNote += ` ${poolNote}`;
    }
    if (depletionFactor < 1) {
      ascosporeNote += ` 子囊孢子放出末期係数 ${Math.round(depletionFactor * 100)}%。`;
    }
  }

  const conidial = computeAppleScabConidialRisk(
    millsPercent,
    ctx?.growthStageId ?? "youngfruit"
  );
  const percent = Math.min(
    100,
    Math.max(ascosporePercent, conidial.percent)
  );

  return {
    percent,
    rationale: [
      `Mills 法（改訂）: 子囊孢子経路 ${ascosporePercent}%・分生胞子経路 ${conidial.percent}% → 表示 ${percent}%（Mills素点 ${millsPercent}%）。`,
      ascosporeNote,
      conidial.summary,
      seasonNote,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export interface OrchardNashiRedSpotContext {
  /** true=近傍に宿主あり, false=なし, null/undefined=未設定 */
  gymnosporangiumHostNearby?: boolean | null;
}

const NASHI_RED_SPOT_NO_HOST_CAP = 4;

/** なし赤星病 — 春季降雨×濡れ（Gymnosporangium）+ 中間宿主設定 */
export function calcNashiRedSpot(
  input: DiseaseWeatherInput,
  ctx?: OrchardNashiRedSpotContext
): InfectionCalcResult {
  const weatherPercent = calculateAppleCedarRustRisk(input);
  if (weatherPercent == null) {
    return {
      percent: null,
      rationale:
        "なし赤星病: 気象データが不足しているため春季感染リスクを算出できませんでした。",
    };
  }

  const host = ctx?.gymnosporangiumHostNearby ?? null;
  const base =
    `なし赤星病: 春季降雨・濡れ継続モデル（Gymnosporangium・4–5月季節係数）: 気象素点 ${weatherPercent}%（0–100）。`;

  if (host === false) {
    return {
      percent: NASHI_RED_SPOT_NO_HOST_CAP,
      rationale: `${base} 中間宿主なし（設定）— 世代交代が成立しないため表示を ${NASHI_RED_SPOT_NO_HOST_CAP}% に抑制。`,
    };
  }

  if (host === true) {
    return {
      percent: weatherPercent,
      rationale: `${base} 中間宿主あり（圃場設定・おおよそ 1–2km 以内）。`,
    };
  }

  return {
    percent: weatherPercent,
    rationale:
      `${base} 中間宿主は未設定 — ビャクシンが近くに無い場合は実リスクはより低くなります（リスク画面で設定可）。`,
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

/** なし黒星 — Duthie (2007) 動的（Ishii 2003 発芽ロジスティック × 感染 L(T)） */
export function calcNashiScab(
  input: DiseaseWeatherInput
): InfectionCalcResult {
  const percent = calculateNashiScabDuthieRisk(input);
  if (percent == null) {
    return {
      percent: null,
      rationale:
        "なし黒星病: 気象データが不足しているため Duthie 動的感染モデルを算出できませんでした。",
    };
  }
  return {
    percent,
    rationale: `なし黒星病（V. nashicola）: Duthie (2007) 系—濡れ期間内の発芽進展（Ishii 2003）と感染最小濡れ L(T) から動的感染危険 ${percent}%（0–100）。`,
  };
}
