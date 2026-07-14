export interface GerminationGddConfig {
  baseTemp: number;
  targetGdd: number;
}

export const GERMINATION_GDD_CONFIG: Record<string, GerminationGddConfig> = {
  未指定: { baseTemp: 10, targetGdd: 100 },
  ぐんま名月: { baseTemp: 10, targetGdd: 100 },
  陽光: { baseTemp: 10, targetGdd: 100 },
  おぜの紅: { baseTemp: 10, targetGdd: 100 },
  紅鶴: { baseTemp: 10, targetGdd: 100 },
  あかぎ: { baseTemp: 10, targetGdd: 100 },
  スリムレッド: { baseTemp: 10, targetGdd: 100 },
  幸水: { baseTemp: 10, targetGdd: 100 },
  豊水: { baseTemp: 10, targetGdd: 100 },
  あきづき: { baseTemp: 10, targetGdd: 100 },
  新高: { baseTemp: 10, targetGdd: 100 },
  群馬N2号: { baseTemp: 10, targetGdd: 100 },
};

export function getGerminationGddConfig(grassName: string): GerminationGddConfig {
  return (
    GERMINATION_GDD_CONFIG[grassName] ?? {
      baseTemp: 10,
      targetGdd: 100,
    }
  );
}
