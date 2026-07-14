export interface GpGrassParams {
  grassName: string;
  optimum: number;
  variance: number;
}

export const WARM_GRASS_GP_PARAMS: Record<
  string,
  { optimum: number; variance: number }
> = {
  未指定: { optimum: 25, variance: 7 },
  ぐんま名月: { optimum: 25, variance: 7 },
  陽光: { optimum: 25, variance: 7 },
  おぜの紅: { optimum: 25, variance: 7 },
  紅鶴: { optimum: 25, variance: 7 },
  あかぎ: { optimum: 25, variance: 7 },
  スリムレッド: { optimum: 25, variance: 7 },
};

export const COOL_GRASS_GP_PARAMS: Record<
  string,
  { optimum: number; variance: number }
> = {
  未指定: { optimum: 25, variance: 7 },
  幸水: { optimum: 25, variance: 7 },
  豊水: { optimum: 25, variance: 7 },
  あきづき: { optimum: 25, variance: 7 },
  新高: { optimum: 25, variance: 7 },
  群馬N2号: { optimum: 25, variance: 7 },
};

export function calculateGrowthPotential(
  temperature: number,
  optimum: number,
  variance: number
): number {
  if (variance === 0) {
    return temperature === optimum ? 1 : 0;
  }

  const gp = Math.exp(-0.5 * Math.pow((temperature - optimum) / variance, 2));
  return Math.max(0, Math.min(1, gp));
}

export function resolveWarmGpParams(warmGrass: string): GpGrassParams {
  const params =
    WARM_GRASS_GP_PARAMS[warmGrass] ?? WARM_GRASS_GP_PARAMS["未指定"];
  return { grassName: warmGrass, ...params };
}

export function resolveCoolGpParams(coolGrass: string): GpGrassParams {
  const params =
    COOL_GRASS_GP_PARAMS[coolGrass] ?? COOL_GRASS_GP_PARAMS["未指定"];
  return { grassName: coolGrass, ...params };
}

export function resolveGpGrassParams(
  greenType: string,
  warmGrass: string,
  coolGrass: string
): GpGrassParams {
  if (greenType === "仁科類" || greenType === "核果類") {
    return resolveCoolGpParams(coolGrass);
  }

  return resolveWarmGpParams(warmGrass);
}

export function calculateMonthlyGp(
  monthlyTemperatures: Array<number | null>,
  optimum: number,
  variance: number
): Array<number | null> {
  return monthlyTemperatures.map((temp) =>
    temp === null || Number.isNaN(temp)
      ? null
      : calculateGrowthPotential(temp, optimum, variance)
  );
}

export interface GpSeriesResult {
  key: string;
  label: string;
  grassName: string;
  optimum: number;
  variance: number;
  monthlyGp: Array<number | null>;
}

const WARM_DEFAULT = "未指定";
const COOL_DEFAULT = "未指定";

export function buildGpSeriesList(
  warmGrass: string,
  coolGrass: string,
  monthlyTemperatures: Array<number | null>
): GpSeriesResult[] {
  const series: GpSeriesResult[] = [];

  const appendSeries = (
    key: string,
    label: string,
    params: GpGrassParams
  ) => {
    series.push({
      key,
      label,
      grassName: params.grassName,
      optimum: params.optimum,
      variance: params.variance,
      monthlyGp: calculateMonthlyGp(
        monthlyTemperatures,
        params.optimum,
        params.variance
      ),
    });
  };

  appendSeries("warm", `林檎: ${warmGrass}`, resolveWarmGpParams(warmGrass));
  appendSeries("cool", `梨: ${coolGrass}`, resolveCoolGpParams(coolGrass));

  if (warmGrass !== WARM_DEFAULT) {
    appendSeries(
      "warmDefault",
      WARM_DEFAULT,
      resolveWarmGpParams(WARM_DEFAULT)
    );
  }

  if (coolGrass !== COOL_DEFAULT) {
    appendSeries(
      "coolDefault",
      COOL_DEFAULT,
      resolveCoolGpParams(COOL_DEFAULT)
    );
  }

  return series;
}
