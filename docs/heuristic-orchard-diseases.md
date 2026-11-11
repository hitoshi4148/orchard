# 簡易病害モデル（ヒューリスティック）— 参照メモ

`src/orchard-risk/heuristic-disease.ts` の閾値は **感染予測ではなく警戒用** です。6日感染表と発病予測（6日ピーク）に利用。

| ID | 病害 | 適温帯（℃） | 濡れ caution / high（h） |
|----|------|-------------|---------------------------|
| apple:alternaria | 斑点落葉病 | 24–32 | 4 / 8 |
| apple:anthracnose | 炭疽病 | 20–28 | 3 / 6 |
| apple:blotch | 輪紋病 | 18–26 | 2 / 5 |
| nashi:blotch | 輪紋病 | 18–26 | 2 / 5 |
| nashi:black_spot | 黒斑病 | 24–32 | 5 / 10 |
| nashi:anthracnose | 炭疽病 | 20–28 | 3 / 6 |

根拠文は各 `reference` 文字列を API `rationales` に付与。
