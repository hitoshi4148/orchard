# ぶどうべと病（grape:downy_mildew）

## 目的

感染危険指数 0–100%（6日感染表・API `rationales`）。

## 入力（48h 窓・評価時点まで）

- 時別: 気温、湿度、降水量（Met Norway + NASA 合成）
- 葉面濡れ: `isHourWet`（降水 ≥0.1 mm/h または RH ≥90%）

## ロジック（P2+ 専用）

1. **適温濡れ時間**: 濡れかつ 18–25℃ の時間数
2. **連続適温濡れ**: 最大連続時間（≥4h / ≥6h で加点）
3. **夜間高湿**: JST 18–06・RH≥92%・適温帯の濡れ時間
4. **降水濡れ時間**: 濡れかつ降水 ≥0.1 mm/h
5. スコア段階＋上記ボーナス × **季節係数**

## 出力

- `percent`: 0–100
- `rationale`: 各カウントと設計メモパス

## 実装

`src/orchard-risk/diseases/grape-downy-mildew.ts`

## 文献・参照（目安）

Plasmopara viticola — 18–25℃・夜間高湿・降雨（果樹病害要覧・extension レビュー）。確定予測ではありません。
