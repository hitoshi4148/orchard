# ぶどう・もも 病害モデル設計メモ（P2 バックエンド）

各ファイルは **入力気象・出力・実装モジュール** の単一ソースです。閾値の数値本体は `src/orchard-risk/heuristic-disease.ts`（`ORCHARD_HEURISTIC_BY_ID`）と同期します。

| 病害 ID | 設計メモ | TypeScript |
|---------|----------|------------|
| grape:downy_mildew | [grape-downy_mildew.md](grape-downy_mildew.md) | `diseases/grape-downy-mildew.ts`（**P2+** 連続濡れ・夜間高湿） |
| grape:black_rot | [grape-black_rot.md](grape-black_rot.md) | `diseases/grape-black-rot.ts`（**P2+** 強雨・若組織） |
| grape:late_rot | [grape-late_rot.md](grape-late_rot.md) | `diseases/grape-late-rot.ts` |
| grape:gray_mold | [grape-gray_mold.md](grape-gray_mold.md) | `diseases/grape-gray-mold.ts`（**P2+** 生育ステージ係数） |
| grape:anthracnose | [grape-anthracnose.md](grape-anthracnose.md) | `diseases/grape-anthracnose.ts` |
| peach:leaf_curl | [peach-leaf_curl.md](peach-leaf_curl.md) | `diseases/peach-leaf-curl.ts`（専用） |
| peach:bacterial_shot_hole | [peach-bacterial_shot_hole.md](peach-bacterial_shot_hole.md) | `diseases/peach-bacterial-shot-hole.ts`（**P2+** 飛沫代理） |
| peach:gray_spot | [peach-gray_spot.md](peach-gray_spot.md) | `diseases/peach-gray-spot.ts` |
| peach:scab | [peach-scab.md](peach-scab.md) | `diseases/peach-scab.ts`（**P2+** 連続濡れ・ステージ） |
| peach:anthracnose | [peach-anthracnose.md](peach-anthracnose.md) | `diseases/peach-anthracnose.ts` |

テスト: `crop-disease-doc.test.ts`、`grape-downy-mildew.test.ts`、`peach-leaf-curl.test.ts`。
