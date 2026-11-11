# turf-tools-router（芝しごと — **果樹園ではない**）

Cloudflare Worker: `turf-tools.jp/portal*` → Pages プロキシ。

| 成果物 | リポジトリ | 本番 |
|--------|------------|------|
| **芝しごと** UI・API | [tool-portal](https://github.com/hitoshi4148/tool-portal) | `tool-portal-9y2.pages.dev` |
| **果樹園しごと** UI・API | **orchard**（本リポ） | `orchard-aa7.pages.dev` |

## 振り分けの単一ソース

`routing-policy.ts` — 変更は **必ず** `routing-policy.test.ts` を通すこと。

- `/portal/risk/` → **常に芝**（地図・施設別リスク）。果樹の `/portal/risk/` とパスが衝突するため orchard へ向けない。
- `/portal/api/orchard-risk` のみ → orchard（任意・Lab から果樹ドメイン利用が主）

## デプロイ

```bash
npm run deploy:turf-router
```

果樹 Pages（`npm run pages:deploy`）とは **別 Worker** です。混同しないこと。

詳細: [docs/orchard-vs-turf-portal.md](../../docs/orchard-vs-turf-portal.md)
