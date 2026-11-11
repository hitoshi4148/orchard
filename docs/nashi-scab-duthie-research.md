# 日本なし黒星病（Venturia nashicola）— Duthie モデル調査メモ

orchard の `nashi:scab` は **Duthie 動的モデル接続予定**（`catalog.ts` / UI）。りんご黒星（Mills / *V. inaequalis*）とは **別病原・別閾値**。

## 推奨一次文献（日本なし）

| 文献 | 内容 | URL |
|------|------|-----|
| Ishii & Yanase (2003) | 発芽・葉感染と温度・RH・濡れ時間（分離葉）。RH>97%、自由水前提。濡れ最短 **7h @ 22℃** など | [Plant Pathology 52(3): 322–327](https://doi.org/10.1046/j.1365-3059.2003.00887.x) |
| Duthie et al. (2007) | *V. nashicola* 分生胞子の **動的感染予測モデル**、無防除園で評価 | [EJPP 118: 53–61](https://doi.org/10.1007/s10658-007-9138-4) |

### Ishii & Yanase（2003）から実装に効く点

- 分生胞子の発芽は **飽和に近い湿度（RH>97%）** が必要；実務上は **自由水（降雨・露）** を葉面濡れの代理とする記述。
- 温度 5–30℃で発芽；最適おおよそ **21℃**。
- 分離葉感染の **最小濡れ時間 L（時間）と温度 T（℃）** の表・回帰があり、22℃で **L=7h** など（論文 Table 3 / 直接・間接モデル）。

### Duthie et al.（2007）

- 上記 germination / infection 曲線を組み合わせた **時系列の感染リスク**（動的モデル）。
- 日本の無防除園データでの検証。orchard では **論文の方程式または配布コードの確認** が次ステップ。

## 混同しやすい「洋ナシ」系モデル（日本なしではない）

| モデル | 病原 | 備考 |
|--------|------|------|
| Spotts & Cervantes / Coop | *V. pirina* | 露地洋ナシ・degree-hour 累積（uspest.org / PNW） |
| UC IPM pear scab | *V. pirina* | 濡れ×温度の多項式（Mills より保守的に）

**日本なし（*V. nashicola*）にこれらをそのまま流用しない。**

## orchard 現状

| 層 | 状態 |
|----|------|
| 6日感染表 | `nashi-scab-ishii.ts` — Ishii & Yanase (2003) L(T) + 濡れ期間 |
| onset | 直近の Ishii 感染候補日（`buildNashiScabOnsetFromHourly`） |
| UI | `modelStatus: duthie`（Duthie 動的モデル接続前の MVP） |

## 実装案（Phase N）

1. **最小版（MVP）**: Ishii & Yanase の **L(T) 直接モデル** + 既存 `isHourWet` / 降水で濡れ期間検出 → 感染可否（0/1）または 0–100 スコア。
2. **標準版**: Duthie (2007) の動的ステップ（胞子着弾・発芽・感染の状態変数）を TypeScript 化；MET 予報 + NASA 履歴は `prepareWeatherAtTarget` を流用。
3. **検証**: `validation-golden.ts` と同様に、文献中の Table 行を fixture テスト化；代表地点は後からユーザー指定を追加。

## 参考文献（書誌）

- Ishii T., Yanase H. (2003). Effects of temperature, RH and wetness period on germination and infection by conidia of *Venturia nashicola*. *Plant Pathology* 52: 322–327. DOI [10.1046/j.1365-3059.2003.00887.x](https://doi.org/10.1046/j.1365-3059.2003.00887.x)
- Duthie J. A. et al. (2007). A dynamic model forecasting infection of pear leaves by conidia of *Venturia nashicola*… *European Journal of Plant Pathology* 118: 53–61. DOI [10.1007/s10658-007-9138-4](https://doi.org/10.1007/s10658-007-9138-4)
