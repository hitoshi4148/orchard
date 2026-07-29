import { DiseaseModelDefinition, DiseaseRiskKey } from "../types";
import { appleCedarRustModel } from "./apple-cedar-rust";
import { appleRingRotModel } from "./apple-ring-rot";
import { appleScabModel } from "./apple-scab";
import { phytophthoraModel } from "./phytophthora-rot";
import { valsaCankerModel } from "./valsa-canker";

/**
 * 病害モデルレジストリ。
 * 新しい病害は models/ 以下に実装し、この配列に追加する。
 */
export const DISEASE_MODELS: DiseaseModelDefinition[] = [
  appleScabModel,
  valsaCankerModel,
  phytophthoraModel,
  appleRingRotModel,
  appleCedarRustModel,
];

export const DISEASE_MODEL_BY_KEY = Object.fromEntries(
  DISEASE_MODELS.map((model) => [model.key, model])
) as Record<DiseaseRiskKey, DiseaseModelDefinition>;
