import type { GrapeCultivationId } from "../parse-grape-cultivation";

/** ぶどう・もも病害計算の圃場コンテキスト（API growth_stage 等） */
export interface CropDiseaseContext {
  growthStageId: string;
  /** ぶどうのみ — 雨よけは感染気象を簡易減衰 */
  cultivationId?: GrapeCultivationId | null;
}

export const DEFAULT_CROP_DISEASE_CONTEXT: CropDiseaseContext = {
  growthStageId: "youngfruit",
  cultivationId: "open",
};
