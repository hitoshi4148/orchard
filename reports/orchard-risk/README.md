# 検証レポート出力

```bash
npm run report:orchard-risk-validation
```

- `reports/orchard-risk/output/<タイムスタンプ>/validation.json` — 機械可読
- 同ディレクトリの `validation.md` — 人間向けサマリー

オプション:

- `--no-live-api` — ゴールデン比較とユニットテストのみ（NASA/MET の本番 API 呼び出しを省略）

終了コード: ユニットまたはゴールデン不一致で `1`。
