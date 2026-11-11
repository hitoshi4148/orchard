# 果樹園しごと（orchard）と芝しごと（tool-portal）の分離

## 二つのプロダクト

| | 果樹園しごと | 芝しごと |
|---|-------------|----------|
| リポジトリ | **orchard**（本リポ） | **tool-portal** |
| Pages プロジェクト | `orchard-aa7` | `tool-portal-9y2` |
| 公開ドメイン（主） | https://orchard-aa7.pages.dev | https://turf-tools.jp/portal/ |
| 病害リスク UI | `/portal/risk/` = **りんご・なし** | `/portal/risk/` = **芝・地図** |

同じ URL パス `/portal/risk/` でも **ホストが違えば別アプリ** です。

## 開発時の原則（orchard リポジトリで作業するとき）

1. **果樹の実装**は `src/orchard-risk/`・`functions/portal/api/orchard-risk.ts`・`public/portal/risk/apple-*`・`public/portal/lab/` など。
2. **`public/portal/risk/app.js`（Leaflet 芝地図）** は fork 残置。**index.html は果樹用に差し替え済み** — 芝地図の改修は tool-portal 側で行う。
3. **`turf-tools-router`** は **[tool-portal](https://github.com/hitoshi4148/tool-portal)** リポのみ（`workers/turf-tools-router/`）。**orchard リポに Worker ソースは置かない**。
4. **デプロイ**
   - 果樹: `npm run pages:deploy` → orchard Pages
   - 芝ドメインのプロキシ: tool-portal で `npm run deploy:router`
5. **リンク**
   - Lab のりんご・なし病害 → `https://orchard-aa7.pages.dev/portal/risk/`（絶対 URL）
   - turf-tools 上で果樹 UI を `/portal/risk/` に載せない

## 回帰防止

- tool-portal: `npm run test:router` … `/portal/risk` が orchard に向かないことを単体テスト
- Cursor ルール `.cursor/rules/orchard-vs-turf.mdc`（orchard リポ）

## トラブル時の確認

```bash
curl -sS https://turf-tools.jp/portal/risk/ | findstr risk-map
curl -sS https://orchard-aa7.pages.dev/portal/risk/ | findstr apple-risk
```

芝は `risk-map`、果樹は `apple-risk` が含まれる想定です。
