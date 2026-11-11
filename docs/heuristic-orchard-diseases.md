# 簡易病害モデル（ヒューリスティック）— 参照メモ

`src/orchard-risk/heuristic-disease.ts` の閾値は **感染予測ではなく警戒用** です。6日感染表と発病予測（6日ピーク）に利用。

**単一ソース:** `listHeuristicThresholdRows()`（`heuristic-disease-doc.test.ts` でカタログと同期を検証）。

| ID | 病害 | 適温帯（℃） | 濡れ caution / high（h） |
|----|------|-------------|---------------------------|
| apple:alternaria | りんご斑点落葉病 | 24–32 | 4 / 8 |
| apple:anthracnose | りんご炭疽病 | 20–28 | 3 / 6 |
| apple:blotch | りんご輪紋病 | 18–26 | 2 / 5 |
| nashi:blotch | なし輪紋病 | 18–26 | 2 / 5 |
| nashi:black_spot | なし黒斑病 | 24–32 | 5 / 10 |
| nashi:anthracnose | なし炭疽病 | 20–28 | 3 / 6 |

根拠文は各 `reference` 文字列を API `rationales` に付与。
