# orchard（果樹園しごとポータル）

果樹園経営に役立つ気象・病害・農薬・AI・作業記録を一か所にまとめた Web ポータル（Cloudflare Pages + Functions）。

画面上のブランド名は **果実園しごと**、キャッチコピーは「果樹園経営を、もっとシンプルに。」です。

**現在のバージョン: v1.2.2**

## 本番 URL

| URL | 内容 |
|-----|------|
| https://orchard-aa7.pages.dev/portal/ | 果樹園しごとポータル TOP（本番） |
| https://orchard-aa7.pages.dev/portal/spray/ | ピンポイント天気で果実園しごと |
| https://orchard-aa7.pages.dev/portal/rac/ | 楽RAC農薬ローテ |
| https://orchard-aa7.pages.dev/portal/risk/ | 病害リスク予報 |
| https://orchard-aa7.pages.dev/portal/diagnosis/ | 病害画像診断AI（ブラウザ内推論） |

> `orchard-aa7` の `-aa7` は Cloudflare が付与した一意サフィックスで削除できません。

**GitHub:** https://github.com/hitoshi4148/orchard

## URL 構成

| パス | 内容 |
|------|------|
| `/portal/` | 果樹園しごとポータル TOP |
| `/portal/spray/` | ピンポイント天気で果実園しごと |
| `/portal/rac/` | 楽RAC農薬ローテ（クライアント完結・FAMIC JSON） |
| `/portal/risk/` | 病害リスク予報（Leaflet 地図・最大4施設） |
| `/portal/diagnosis/` | 病害画像診断AI（ONNX Runtime Web・端末内推論） |
| `/portal/api/risk-map` | 病害リスク一括取得 API（地図用） |
| `/portal/api/dashboard` | ポータル TOP 用まとめ取得 API |
| `/portal/api/weather` | 天気予報 API（単体・デバッグ用） |
| `/portal/api/disease-risk` | 病害リスク API（単体・デバッグ用） |
| `/portal/api/growth-potential` | Growth Potential API（単体・デバッグ用） |
| `/portal/api/gdd` | 積算温度（GDD）API |
| `/portal/api/chat` | AI質問箱 API（Gemini・果実栽培） |
| `/portal/api/google-config` | 果実園しごとノート用 Google OAuth クライアント ID 取得 |
| `/portal/api/geocode` | 逆ジオコーディング API |
| `/portal/api/fruit-market` | 果物卸売相場（農水省日別 CSV・1日1回キャッシュ） |
| `/portal/spray/api/forecast` | 散布予報 API |

## ポータル TOP 機能

`/portal/` では以下を表示します。

### レイアウト

```
[[果樹園名](地名)] [果実園しごと PNG ロゴ]          [⚙ 設定]
[果樹園経営を、もっとシンプルに。 ℹ]
[AI質問箱（果実栽培・入力欄・注意4カ条）]
[48h 天気予報ウィジェット]  「もっと詳しく」→ /portal/spray/
┌─────────────────┬─────────────────┐
│ 病害リスク予測   │ 摘果適時・収穫時期予測 │
└─────────────────┴─────────────────┘
[果実園しごとノート（Google スプレッドシート連携）]
┌─────────────────┬─────────────────┐
│ 成長能(Growth   │ 農薬検索         │
│  Potential)     │ → /portal/rac/  │
└─────────────────┴─────────────────┘
[果物の卸売相場（参考）— 東京・大阪・名古屋・福岡 / 産地別・品種展開]
[果実園しごとシリーズ（2列カードグリッド）]
[PR | ブログ | YouTube バナー（3列）]
[フッター: 気象クレジット / グロウアンドプログレス / v1.2.2]
```

| 機能 | 説明 |
|------|------|
| タイトル | `[果樹園名](地名)` + **果実園しごと PNG ロゴ**（横並び・中央寄せ）。地名は逆ジオコーディング（Nominatim）で取得し Cookie に保存 |
| ブランドメッセージ | ロゴ下に「果樹園経営を、もっとシンプルに。」。右の **ℹ** でサイト説明（PC: ホバー、スマホ: タップ） |
| 設定 | 果樹園名・緯度経度・栽培タイプ・植物タイプ・林檎品種・梨品種・AI回答モードなど（Cookie `portalSettings` に保存） |
| AI質問箱 | タイトル下の入力欄から Gemini による果実栽培 Q&A（Cloudflare Functions） |
| 天気予報 | 48h 横スクロールウィジェット。「もっと詳しく」から `/portal/spray/` へ（予報データはキャッシュ利用） |
| 病害リスク予測 | 翌日・明後日 朝6:00 時点の5病害リスク（%）。各病害名横に「判定ロジック」モーダル |
| 摘果適時・収穫時期予測 | 満開日からの DAFB（摘果適時）ゲージ、および満開日からの収穫適時積算温度（GDD）ゲージ |
| 果実園しごとノート | Google 連携で作業履歴をスプレッドシートに保存（Growth Potential の上に表示） |
| 成長能(Growth Potential) | 昨年の月平均気温から算出した GP 曲線。右隣に農薬検索パネル |
| 農薬検索 | 農薬名・病害虫名で検索し `/portal/rac/` へ遷移して結果一覧を自動表示（URL クエリ `pesticide` / `target`） |
| 果物の卸売相場（参考） | 農水省「青果物卸売市場調査」日別 CSV から、東京・大阪・名古屋・福岡の **卸売平均価格** を表示。市場比較サマリー＋産地別一覧（品種展開） |
| 果実園しごとシリーズ | 関連アプリへのリンクカード（2列）。各カード名横の **ℹ** で説明文を表示 |
| 関連バナー | PR・ブログ・YouTube を 3 列 1 行（最大幅 720px）でフッター上に表示 |
| フッター | 気象データクレジット・グロウアンドプログレスリンク・**v1.2.2** |

### 設定（⚙）

| 項目 | 内容 |
|------|------|
| 果樹園名 | ヘッダー表示・作業ノートのスプレッドシート名 `{果樹園名}作業履歴` に使用 |
| 場所 | 緯度・経度（現在地取得ボタンあり） |
| 栽培タイプ | 未指定 / ハウス栽培 / 露地栽培 |
| 植物タイプ | 未指定 / 仁科類 / 核果類 / 漿果類 / 柑橘類 |
| 林檎品種 | ぐんま名月・陽光・おぜの紅 など |
| 梨品種 | 幸水・豊水・あきづき など |
| AI 回答モード | 未指定 / 慎重に回答（デフォルト） |

### 果物の卸売相場（参考）

果実園しごとシリーズの直上に、農林水産省 **青果物卸売市場調査（日別調査）** の公式 CSV から取得した卸売価格を表示します。

| 項目 | 内容 |
|------|------|
| 市場 | 東京・大阪・名古屋・福岡 |
| 果物 | りんご（りんご計）・なし（日本なし計）・ぶどう（ぶどう計）・キウイ |
| 表示 | 市場比較サマリー（品目計）＋ 産地別一覧（▶ で品種展開） |
| 対象日 | 最新公表日のみ（v1） |
| 更新 | サーバー側キャッシュ **1日1回**（MAFF ZIP 取得 → 4市場 CSV パース） |
| API | `GET /portal/api/fruit-market?city=1301&fruit=apple` |

出典表示: 「青果物卸売市場調査（農林水産省）」。**卸売相場**であり小売実売ではありません。

### 摘果適時・収穫時期予測（DAFB / GDD）

満開日は Cookie に保存します（内部キー名は [agromap](https://github.com/hitoshi4148/agromap) 由来のレガシー名を継承）。

| Cookie 名 | 用途 |
|-----------|------|
| `agromap_primomax_date` | 早生・日本ナシの満開日（摘果適時 DAFB） |
| `agromap_greenfield_date` | 晩生・リンゴの満開日（摘果適時 DAFB） |
| `agromap_warm_seeding_date` | ふじの満開日（収穫適時積算温度） |
| `agromap_cool_seeding_date` | 幸水の満開日（収穫適時積算温度） |

**摘果適時（DAFB）**

| 対象 | 目安 |
|------|------|
| 早生・日本ナシ | 摘花開始 20D / 摘花終了 40D |
| 晩生・リンゴ | 摘花開始 20D / 摘花終了 60D |

**収穫適時積算温度（GDD、基準温度 5℃）**

| 品種 | 収穫目安 | 収穫終了 |
|------|----------|----------|
| ふじ | 3500 GDD | 4000 GDD |
| 幸水 | 2000 GDD | 2500 GDD |

API: `/portal/api/gdd`（NASA POWER daily）。dashboard とは独立して満開日ごとに呼び出します。

### 病害リスク「判定ロジック」

各病害名の右に **判定ロジック** ボタンがあります。クリックするとモーダルで計算方法を表示します。

| 表示名 | モデル |
|--------|--------|
| 黒星病 | Venturia inaequalis |
| 腐らん病 | Valsa ceratosperma 等 |
| かいよう病 | Phytophthora spp. |
| 輪紋病 | Botryosphaeria dothidea |
| 赤星病 | Gymnosporangium yamadae（中間宿主ビャクシン類の有無は未考慮） |

判定ロジックの文言は `public/portal/disease-risk-ui.js` の `DISEASE_LOGIC` に定義しています。サーバー側モデルは `src/disease/models/` にあります。

### 果樹園しごと・AI質問箱

[turf_advisor](https://github.com/hitoshi4148/turf_advisor) のチャット基盤を Cloudflare Pages Functions に移植し、果実栽培向けに利用しています。

- UI: 注意4カ条（ℹ ボタン）・入力欄・「AIに質問」ボタン。初回送信でチャット欄が縦に展開
- 設定: ポータル設定（緯度経度・品種等）＋ AI回答モードをプロンプトに反映
- 履歴: ページを開いている間のみ（リロードで消える）
- 回答表示: 長文でも**回答の先頭**が見える位置へスクロール
- API: `POST /portal/api/chat` → Gemini（`GEMINI_API_KEY` 必須）

#### 環境変数

| 変数 | 必須 | 説明 |
|------|------|------|
| `GEMINI_API_KEY` | はい | [Google AI Studio](https://aistudio.google.com/) の API キー |
| `GEMINI_MODEL` | いいえ | デフォルト `gemini-2.5-flash` |
| `GOOGLE_OAUTH_CLIENT_ID` | 果実園しごとノート利用時 | Google Cloud OAuth 2.0 Web クライアント ID |

**ローカル**: `.dev.vars.example` を `.dev.vars` にコピーしてキーを設定（`wrangler pages dev` が自動読み込み）

**本番**: Cloudflare Pages ダッシュボード → **orchard** → Settings → Variables and Secrets → **Production**

### 果実園しごとノート（Google スプレッドシート）

成長能（Growth Potential）の上に **果実園しごとノート** パネルを表示します。メモ機能を使う場合のみ **Googleで連携** から OAuth 同意を求めます。

| 項目 | 内容 |
|------|------|
| 保存先 | 利用者 Google ドライブ（マイドライブ） |
| ファイル名 | `{果樹園名}作業履歴`（設定 Cookie の果樹園名から自動生成） |
| 列 | A: 日付 / B: 圃場名 / C: メモ |
| UI | 直近履歴を約5行分表示、スクロールで過去分を参照。下部フォームから追記・行クリックで編集・削除 |
| OAuth スコープ | `drive.file`（このアプリが作成したファイルのみ） |
| API | `GET /portal/api/google-config`（OAuth クライアント ID） |

**モニター限定（Testing モード）**

Google Cloud Console で OAuth 同意画面を **Testing** のまま運用し、利用者の Google アカウントを **テストユーザー** に登録してください（最大100件）。

**Google Cloud 設定手順（概要）**

1. **orchard-portal** など果樹園専用の Google Cloud プロジェクトを作成（芝しごと tool-portal と OAuth 同意画面を分離）
2. **Google Drive API** / **Google Sheets API** を有効化
3. OAuth 同意画面（External・Testing）→ **アプリ名: 果樹園しごとポータル** → テストユーザーを追加
4. スコープ: `https://www.googleapis.com/auth/drive.file`
5. OAuth 2.0 クライアント ID（Web）を作成  
   - 許可 JS オリジン: `https://orchard-aa7.pages.dev` / `http://127.0.0.1:8790`
6. クライアント ID を `GOOGLE_OAUTH_CLIENT_ID` に設定（`.dev.vars` / Cloudflare Pages）

### 果実園しごとシリーズ

関連アプリへのリンクを 2 列カードグリッドで表示します。カード名横の **ℹ** で説明文を表示します（PC: ホバー、スマホ: タップ）。

| アプリ | カテゴリ | 備考 |
|--------|----------|------|
| 楽RAC農薬ローテ | 管理 | 同一サイト `/portal/rac/` |
| 病害リスク予報 | 予報 | 同一サイト `/portal/risk/` |
| 病害画像診断AI | AI | 同一サイト `/portal/diagnosis/` |
| ピンポイント天気で果実園しごと | 予報 | 同一サイト `/portal/spray/` |
| その他（ターフプール・施肥設計ナビ 等） | 各種 | tool-portal からの fork 由来。外部 Render アプリへのリンク |

> シリーズカードの一部は fork 元 [tool-portal](https://github.com/hitoshi4148/tool-portal)（芝しごと）のリンクを引き継いでいます。順次、果樹園向けに差し替え予定です。

### ピンポイント天気への遷移と予報キャッシュ

ポータル TOP の `/portal/api/dashboard` 取得時に、同じ MET Norway データから **散布予報（sprayForecast）** もサーバー側で生成します。  
ブラウザは `sessionStorage`（キー: `portalSprayForecastCache`）に保存し、「もっと詳しく」やシリーズから `/portal/spray/` へ遷移した際、**同一緯度経度・1時間以内** であれば MET Norway への再取得を省略します。

| 条件 | spray ページの動作 |
|------|-------------------|
| ポータル TOP 表示直後に遷移 | キャッシュから即表示 |
| 緯度経度を変更 | 再取得 |
| 1時間超過 | 再取得 |
| spray を直接開く | 再取得（キャッシュなし） |

spray ページは `portalSettings` Cookie の緯度経度を優先して読み込みます。

### 関連バナー（フッター上）

| バナー | リンク先 |
|--------|----------|
| PR（農薬・資材メーカー向け） | https://www.turf-tools.jp/services-4 |
| 技術ブログ | https://www.turf-tools.jp/blog |
| YouTube | https://www.youtube.com/channel/UCSRU0zk4Fj1ETWqMRlJDPJQ |

## 変更履歴

> v1.0 以前の履歴は fork 元 [tool-portal](https://github.com/hitoshi4148/tool-portal)（芝しごとポータル）のものです。

### v1.2.2（2026-10）

- **簡易認証**: user name ゲートを削除（`/portal/` を直接表示）

### v1.2.1（2026-08）

- **アクセス制限**: user name ゲートを追加（v1.2.2 で削除）

### v1.2.0（2026-08）

- **果実園しごとノート**: Google OAuth を orchard-portal 専用 GCP プロジェクトで運用（同意画面アプリ名: 果樹園しごとポータル）
- README に OAuth 設定手順を追記

### v1.1.7（2026-08）

- **果実園しごとノート**: Growth Potential の上に作業履歴パネルを追加（Google スプレッドシート・`drive.file` スコープ）
- **ローカル開発**: `npm run dev` のポートを **8790** に変更（tool-portal の 8788 と衝突回避）

### v1.1.6（2026-07）

- **病害リスク**: 輪紋病・赤星病モデルを追加し、5病害すべて 0–100% 表示に対応
- **摘果適時 / 収穫適時**: DAFB ゲージに「摘花開始」「摘花終了」ラベル。収穫 GDD ゲージに「収穫目安」「収穫終了」ラベル
- **AI質問箱**: 回答表示時に先頭が見える位置へスクロール

### v1.1.0 〜 v1.1.5（2026-07）

- 病害リスク予測 / 成長能 / 農薬検索の2列レイアウト
- ダッシュボード API の single-flight キャッシュ・クライアント側リトライ強化
- GA4 ページタイトルを「果実園しごとポータル」に固定

### fork 由来（tool-portal）

- Cloudflare Pages + Functions 基盤、48h 天気・病害リスク・GDD・Growth Potential 統合
- `/portal/spray/`・`/portal/rac/`・`/portal/risk/`・`/portal/diagnosis/` の各サブアプリ移植
- AI質問箱（Gemini）、2列シリーズカード、PNG ロゴ、関連バナー

## npm スクリプト

| コマンド | 内容 |
|----------|------|
| `npm run dev` | ローカル開発サーバー（`http://127.0.0.1:8790`） |
| `npm run deploy` | Pages へ手動デプロイ（Direct Upload 運用時は本番更新に必要） |

## ローカル開発

```powershell
npm install
npm run dev
```

ブラウザで以下を開いてください:

- http://127.0.0.1:8790/portal/
- http://127.0.0.1:8790/portal/spray/
- http://127.0.0.1:8790/portal/rac/
- http://127.0.0.1:8790/portal/risk/

AI質問箱・果実園しごとノートをローカルで試す場合は `.dev.vars` に `GEMINI_API_KEY` / `GOOGLE_OAUTH_CLIENT_ID` が必要です。

> **注意**: Live Server 等の静的サーバーでは Pages Functions が動きません。必ず `npm run dev`（wrangler pages dev）を使い、`http://127.0.0.1:8790/portal/` から開いてください。

### wrangler レジストリエラー（Windows）

`ENOENT` が出る場合:

```powershell
New-Item -ItemType Directory -Force -Path "$env:APPDATA\xdg.config\.wrangler\registry\orchard"
```

## Cloudflare Pages へのデプロイ

GitHub リポジトリ: https://github.com/hitoshi4148/orchard  
本番 URL: https://orchard-aa7.pages.dev/portal/

### 現状

`orchard` プロジェクトは **Direct Upload（wrangler 手動デプロイ）** で作成されているため、**Git push だけでは本番は更新されません**（`wrangler pages project list` の Git Provider が `No`）。

手動デプロイ:

```powershell
npm run deploy
```

Secret の設定例:

```powershell
npx wrangler pages secret put GEMINI_API_KEY --project-name=orchard
npx wrangler pages secret put GOOGLE_OAUTH_CLIENT_ID --project-name=orchard
```

### push で自動デプロイする（推奨: ダッシュボードで Git 連携）

Wrangler CLI から Git 連携はできないため、Cloudflare ダッシュボードで接続します。

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **orchard**
2. **Settings** → **Builds** → **Connect to Git**
3. GitHub を選び、リポジトリ **`hitoshi4148/orchard`** を接続
4. **Production branch**: `main`
5. ビルド設定:

   | 項目 | 値 |
   |------|-----|
   | Framework preset | None |
   | Build command | （空欄） |
   | Build output directory | `public` |
   | Root directory | `/` |

6. **Deploy command / Version command** は設定しない（空欄または `exit 0`）
7. 保存すると `main` の最新コミットから Production デプロイが走ります

**注意**

- **Build → Variables and secrets** はビルド用。`GEMINI_API_KEY` 等のランタイム Secret は **Settings → Variables and Secrets（Production）** に設定
- Git 連携後も緊急時は `npm run deploy` で手動デプロイ可能

### 関連: tool-portal（芝しごと）

fork 元の [tool-portal](https://github.com/hitoshi4148/tool-portal) は別 Pages プロジェクト（`tool-portal-9y2.pages.dev`）および `turf-tools.jp/portal/` で稼働しています。本リポジトリ `orchard` とは別管理です。

## 外部 API の利用方針

ポータル TOP は **1 回の `/portal/api/dashboard` 呼び出し** で天気・病害リスク・GP をまとめて取得します。

### MET Norway（Locationforecast 2.0）

| 利用箇所 | 呼び出し回数 | 用途 |
|----------|--------------|------|
| `/portal/api/dashboard` | **1 回** | 48h 天気 + 72h 病害リスク + spray 用キャッシュ |
| `/portal/spray/` | 0〜1 回 | キャッシュがあれば省略 |

### NASA POWER

| 利用箇所 | 呼び出し回数 | 用途 |
|----------|--------------|------|
| Daily（統合） | **1 回** | GP 用の昨年月平均気温 + 病害用の過去日次 |
| Hourly | **1 回** | 病害リスク計算用の時間別気温・湿度 |
| Daily（GDD） | 満開日ごと | 摘果適時・収穫適時ゲージ（`/portal/api/gdd`） |

### その他

| サービス | 利用箇所 | 備考 |
|----------|----------|------|
| Nominatim (OSM) | `/portal/api/geocode` | 設定保存時・現在地取得時のみ |
| Google Gemini | `/portal/api/chat` | AI質問箱 |
| Google Drive / Sheets | 果実園しごとノート | ブラウザ内 OAuth（`drive.file`） |

### データフロー（ポータル TOP）

```
ブラウザ
  └─ GET /portal/api/dashboard?lat=&lon=&warmGrass=&coolGrass=
       ├─ MET Norway ............... 1 回 → 天気 + 病害 forecast + sprayForecast
       ├─ NASA POWER daily ......... 1 回 → GP + 病害 daily
       └─ NASA POWER hourly ........ 1 回 → 病害 hourly

  └─ GET /portal/api/gdd?... ....... 満開日ごと → DAFB / 収穫 GDD ゲージ

  └─ /portal/spray/ 遷移時 ........ sessionStorage キャッシュ → MET 再取得省略（条件付き）
```

## プロジェクト構成

```
orchard/
├── public/
│   ├── index.html                # / → /portal/ リダイレクト
│   └── portal/
│       ├── index.html            # ポータル TOP
│       ├── portal.js / portal.css
│       ├── work-memo-ui.js       # 果実園しごとノート（Google Sheets / drive.file）
│       ├── fruit-market-ui.js    # 果物卸売相場（農水省 CSV）
│       ├── disease-risk-ui.js    # 病害リスク表示・判定ロジック（TOP/risk 共有）
│       ├── portal-title-logo.png
│       ├── spray/                # ピンポイント天気
│       ├── rac/                  # 楽RAC農薬ローテ
│       ├── risk/                 # 病害リスク予報（Leaflet 地図）
│       └── diagnosis/            # 病害画像診断AI（ONNX）
├── functions/portal/
│   ├── api/                      # Pages Functions（API）
│   │   ├── dashboard.ts
│   │   ├── weather.ts
│   │   ├── disease-risk.ts
│   │   ├── risk-map.ts
│   │   ├── growth-potential.ts
│   │   ├── gdd.ts
│   │   ├── chat.ts
│   │   ├── google-config.ts
│   │   ├── fruit-market.ts
│   │   └── geocode.ts
│   └── spray/api/forecast.ts
├── src/
│   ├── portal/fetch-dashboard.ts
│   ├── advisor/                  # AI質問箱（Gemini）
│   ├── weather/
│   ├── disease/models/           # 果樹病害リスクモデル（5種）
│   ├── growth-potential/
│   ├── gdd/
│   ├── geocode/
│   ├── maff-market/              # 農水省卸売 CSV 取得・パース
│   └── spray/
├── wrangler.toml
├── .dev.vars.example
└── package.json
```

## 元アプリ・関連リポジトリ

| リポジトリ | 関係 |
|------------|------|
| [tool-portal](https://github.com/hitoshi4148/tool-portal) | fork 元（芝しごとポータル） |
| [spray-forecast](https://github.com/hitoshi4148/spray-forecast) | `/portal/spray/` の元 |
| [racrac](https://github.com/hitoshi4148/racrac) | `/portal/rac/` の元 |
| [ai_forecast](https://github.com/hitoshi4148/ai_forecast) | `/portal/risk/` の元（果樹向けモデルに差し替え済み） |
| [turf_advisor](https://github.com/hitoshi4148/turf_advisor) | AI質問箱を Cloudflare Functions に移植 |
| [agromap](https://github.com/hitoshi4148/agromap) | 満開日 Cookie 名のレガシー互換 |

ロジックは Python 版から TypeScript に移植済みです。

## ライセンス

MIT
