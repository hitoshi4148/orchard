# ぶどう黒とう病（grape:black_rot）

## 入力

48h 窓・適温 20–28℃ の濡れ時間（`calcWetTempHeuristic`）。

## ロジック

濡れ閾値ベース ＋ **強雨適温時間**（≥0.5 mm/h・20–28℃）＋ **6h 降水ピーク** × 季節 × **若組織ステージ**（`youngfruit`/`leaf` 高）。

## 参照

Guignardia — 降雨期の若組織×湿潤（簡易）。
