# 簡易病害モデル（ヒューリスティック）— 参照メモ

`src/orchard-risk/heuristic-disease.ts` の閾値は **感染予測ではなく警戒用** です。6日感染表と発病予測（6日ピーク）に利用。

**単一ソース:** `listHeuristicThresholdRows()`（`heuristic-disease-doc.test.ts` でカタログと同期を検証）。

| ID | 病害 | 適温帯（℃） | 濡れ caution / high（h） |
|----|------|-------------|---------------------------|
| apple:alternaria | りんご斑点落葉病 | 23–32 | 4 / 8 |
| apple:anthracnose | りんご炭疽病 | 20–28 | 3 / 6 |
| apple:blotch | りんご輪紋病 | 18–27 | 2 / 5 |
| nashi:blotch | なし輪紋病 | 18–26 | 2 / 5 |
| nashi:black_spot | なし黒斑病 | 24–32 | 5 / 10 |
| nashi:anthracnose | なし炭疽病 | 20–28 | 3 / 6 |
| grape:downy_mildew | ぶどうべと病 | 18–25 | 4 / 8 |
| grape:black_rot | ぶどう黒とう病 | 20–28 | 3 / 6 |
| grape:late_rot | ぶどう晩腐病 | 22–30 | 2 / 5 |
| grape:gray_mold | ぶどう灰色かび病 | 15–22 | 4 / 8 |
| grape:anthracnose | ぶどう褐斑病 | 24–32 | 2 / 5 |
| peach:bacterial_shot_hole | もも細菌性穿孔病 | 15–26 | 2 / 4 |
| peach:gray_spot | もも灰色炭疽病 | 20–28 | 3 / 6 |
| peach:scab | もも黒星病 | 18–24 | 4 / 8 |
| peach:leaf_curl | ももいさか病 | 10–18 | 6 / 12 |
| peach:anthracnose | もも炭疽病 | 20–28 | 3 / 6 |

根拠文は各 `reference` 文字列を API `rationales` に付与。

**計算の置き場所（病害地図ではなく API / 各作物 UI）**

| 作物 | モジュール | 内容 |
|------|------------|------|
| りんご・なしの上記 | `diseases/apple-secondary.ts` / `nashi-secondary.ts` | 輪紋は `apple-ring-rot` 季節モデル、他は季節補正付き |
| ぶどう5病 | `diseases/grape-*.ts`（レジストリ `grape-models.ts`） | 設計: `docs/orchard-disease-models/`。べと病は専用ロジック |
| もも5病 | `diseases/peach-*.ts`（レジストリ `peach-models.ts`） | 同上。ももいさか病は専用ロジック |

品種係数は `variety.ts` の病害別テーブルで感染％に反映。ぶどう・ももは `/portal/grape-risk/`・`/portal/peach-risk/` から API 連動。
