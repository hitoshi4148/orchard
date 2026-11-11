# ぶどう灰色かび病（grape:gray_mold）

## 入力

48h・適温 15–22℃・濡れ。

## ロジック

`calcWetTempHeuristic`（15–22℃）＋涼冷濡れボーナス × 季節 × **`growth_stage` 係数**（`bloom` 高）。`diseases/grape-gray-mold.ts`。

## 参照

Botrytis cinerea — 開花前後の持続湿潤。
