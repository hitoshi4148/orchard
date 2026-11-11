# ぶどうべと病（grape:downy_mildew）

## 目的

感染危険指数 0–100%（6日感染表・API `rationales`）。

## 入力（48h 窓・評価時点まで）

- 時別: 気温、湿度、降水量（Met Norway + NASA 合成）
- 葉面濡れ: `isHourWet`（降水 ≥0.1 mm/h または RH ≥90%）

## ロジック（P2 専用）

1. **適温濡れ時間**: 濡れかつ 18–25℃ の時間数
2. **降水濡れ時間**: 濡れかつ降水 ≥0.1 mm/h の時間数（飛散・洗浄の代理）
3. スコア段階（8 / 22 / 50 / 78）＋降水ボーナス
4. **季節係数**（5–7月ピーク）を乗算

## 出力

- `percent`: 0–100
- `rationale`: 各カウントと設計メモパス

## 実装

`src/orchard-risk/diseases/grape-downy-mildew.ts`

## 文献・参照（目安）

Plasmopara viticola — 18–25℃・夜間高湿・降雨（果樹病害要覧・extension レビュー）。確定予測ではありません。
