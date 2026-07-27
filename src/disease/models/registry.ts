import { DiseaseModelDefinition, DiseaseRiskKey } from "../types";
import { appleScabModel } from "./apple-scab";
import { phytophthoraModel } from "./phytophthora-rot";
import { valsaCankerModel } from "./valsa-canker";

function createPendingModel(
  key: DiseaseRiskKey,
  displayName: string
): DiseaseModelDefinition {
  return {
    key,
    displayName,
    description: `${displayName}モデルは順次実装予定です。`,
    calculate: () => null,
  };
}

/**
 * 病害モデルレジストリ。
 * 新しい病害は models/ 以下に実装し、この配列に追加する。
 */
export const DISEASE_MODELS: DiseaseModelDefinition[] = [
  appleScabModel,
  valsaCankerModel,
  phytophthoraModel,
  createPendingModel("anthracnose", "輪紋病"),
  createPendingModel("largePatch", "赤星病"),
];

export const DISEASE_MODEL_BY_KEY = Object.fromEntries(
  DISEASE_MODELS.map((model) => [model.key, model])
) as Record<DiseaseRiskKey, DiseaseModelDefinition>;
