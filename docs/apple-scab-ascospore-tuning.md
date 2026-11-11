# りんご黒星・升孢子（群馬向けチューニングメモ）

## 固定窓ゴールデン（NASA POWER）

| 項目 | 値 |
|------|-----|
| 緑期日 | `2026-03-25` |
| 窓終了 | `2026-06-30` |
| 地点 | 前橋・高崎・渋川・沼田（同一格子で期待値共有） |

6/15 照会時のスナップショット日は `2026-06-13`（降雨イベント日のみ更新のため）。

定数・期待値: `src/orchard-risk/validation-golden.ts`  
統合テスト: `apple-scab-ascospore-pool.integration.test.ts`  
レポート: `npm run report:orchard-risk-validation`

## 主要パラメータ

| 定数 | 既定 | ファイル |
|------|------|----------|
| `ASCOSPORE_RELEASE_FRACTION_BASE` | 0.14 | `apple-scab-ascospore-season-pool.ts` |
| `ASCOSPORE_RELEASE_PRECIP_MM_MID` | 3（mm） | 同上・放出降水量補正の目安 |
| `ASCOSPORE_MATURITY_MIN_FOR_RELEASE` | 8（%） | 同上 |
| 残病葉初期プール | 60 / 100 / 130 | `parse-ascospore-inoculum.ts` |

供給係数は `残量 / 初期プール%` で正規化（130% 初期でも 1.0 を超えない）。

## API

- `scab_inoculum=low|normal|high`
- 応答 `ascosporePool`: 評価日（本日 18:00 JST）時点の枯渇プール

## Worker 向け hourly 窓

- 一次季節内でも枯渇プール用 hourly は最大 **75 日**遡及（CPU 1102 対策）
- 窓より前は `computeAscosporePoolCarryInFromDaily` で日降水量から繰り越し

## 未実装（RIMpro 級）

- 降雨 mm 連動の放出曲線の現地キャリブレーション
- 樹冠残病率の空間分布
- 群馬以外のゴールデン窓
