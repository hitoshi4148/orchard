# ぶどう黒とう病（grape:black_rot）

## 入力

48h 窓・適温 20–28℃ の濡れ時間（`calcWetTempHeuristic`）。

## ロジック

季節係数（5–8月ピーク）× 閾値スコア。実装: `diseases/grape-black-rot.ts` → `grape-season.ts`。

## 参照

Guignardia — 降雨期の若組織×湿潤（簡易）。
