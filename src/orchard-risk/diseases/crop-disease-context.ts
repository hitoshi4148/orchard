/** ぶどう・もも病害計算の圃場コンテキスト（API growth_stage） */
export interface CropDiseaseContext {
  growthStageId: string;
}

export const DEFAULT_CROP_DISEASE_CONTEXT: CropDiseaseContext = {
  growthStageId: "youngfruit",
};
