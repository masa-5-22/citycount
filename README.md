# Citycount 到達指数ダッシュボード

ブラウザで開くだけで利用できる、世界の国・日本の都道府県・日本の市区町村の旅行接触度（0〜10 点）を記録するツールです。地図や一覧から地域を選び、滞在状況を入力すると推奨スコアが自動で表示されます。

## 機能概要

- **世界**: 249 の国・地域（ISO 3166-1 基準）を収録。MapLibre GL ベースの世界地図で国境ポリゴンをスコアに応じた色で塗り分け、クリックすると入力ダイアログが開きます。
- **日本の都道府県**: MapLibre 上で都道府県境界ポリゴンを読み込み、スコアを 0〜10 のグラデーションで表示。地図と一覧のどちらからでも編集できます。
- **日本の市区町村**: 国土地理院の市区町村ポリゴンを参照して描画。サンプル 60 件に加えて CSV/JSON インポートで拡張でき、地図上をクリックすると該当自治体を自動認識して編集ダイアログを開きます。
- **スコア判定支援**: yearsLived や totalNights などを入力すると推奨スコアを即座に計算。最終スコアは 0〜10 の整数で上書きできます。
- **スコア可視化**: 一覧やダイアログに 0〜10 点のカラーメーターとラベル付きチップを表示し、現在値と推奨値の違いを直感的に把握できます。
- **永続化**: 入力内容はブラウザの `localStorage` に自動保存され、次回以降も引き継がれます。
- **CSV エクスポート**: 各セクションごとに CSV を出力可能。滞在日数やメモも一緒に出力されます。

## すぐにサイトを表示する方法

1. このリポジトリを ZIP ダウンロードするか `git clone` します。
2. 展開したフォルダー内で `index.html` をダブルクリックするだけで、既定のブラウザで地図付きダッシュボードが開きます。
   - MapLibre のスタイルは外部 CDN を参照しているため、初回表示時にはインターネット接続が必要です。
   - ブラウザは Chrome / Edge / Safari / Firefox の最新版を推奨します。
3. URL の形式を本番に近付けたい場合は、フォルダーで `python -m http.server 8000` を実行し、ブラウザで `http://localhost:8000/index.html` にアクセスしてください。

## 立ち上げフロー（詳細）

以下の手順を順番に実行すると、手元での動作確認から本番公開まで一通りの準備ができます。

### 1. リポジトリを取得する

```bash
git clone https://github.com/your-account/citycount.git
cd citycount
```

ZIP で取得する場合は、解凍後に同じ階層構造（`index.html`・`app.js`・`styles.css`・`data/` など）が保たれていることを確認してください。

### 2. ローカルで挙動を確認する

```bash
# シンプルな HTTP サーバーで公開 (Python 3 がインストール済みの場合)
python -m http.server 8000

# ブラウザでアクセス
open http://localhost:8000/index.html  # macOS
start http://localhost:8000/index.html # Windows (PowerShell)
xdg-open http://localhost:8000/index.html # Linux
```

ブラウザにダッシュボードが表示され、マップの拡大縮小・ポリゴンのクリック・スコア入力ができれば準備完了です。変更した内容は `localStorage` に保存されるため、ページ再読込後も保持されます。

### 3. 静的ホスティングに配置する

#### GitHub Pages

1. GitHub 上にリポジトリを作成し、上記ファイル一式を push します。
2. Repository Settings → Pages で `Deploy from a branch` を選択し、`main` ブランチ・`/(root)` ディレクトリを指定します。
3. 数十秒後に公開 URL が発行されるのでアクセスして確認します。

##### GitHub Pages を使った詳細な公開フロー

以下の手順で、初めての方でも GitHub Pages からサイトを立ち上げられます。

1. **リポジトリを準備する**  
   - GitHub にサインインし、右上の **New repository** から任意の名前（例: `citycount-dashboard`）でリポジトリを作成します。  
   - 「Private」でも構いませんが、公開サイトにしたい場合は「Public」を選んでおくと URL にアクセス制限が掛かりません。
2. **ファイルをアップロードする**  
   - ローカルで `git clone` したものをそのまま push するか、GitHub の Web UI の **Add file → Upload files** から `index.html`・`app.js`・`styles.css`・`data/` をまとめてアップロードします。  
   - `main` ブランチ直下に配置されていることを確認してください。
3. **Pages を有効化する**  
   - リポジトリ画面の **Settings → Pages** を開きます。  
   - **Source** のプルダウンで「Deploy from a branch」を選び、Branch に `main`、Folder に `/ (root)` を指定して **Save** を押します。
4. **公開 URL を確認する**  
   - 数十秒〜数分でビルドが完了すると、同じページに `Your site is live at ...` というメッセージと URL が表示されます。  
   - `https://<ユーザー名>.github.io/<リポジトリ名>/` にアクセスし、地図が表示されるか確認します。
5. **更新を反映する**  
   - ファイルを更新したら再度 push します。Push 後に Pages が自動で再ビルドされ、数十秒後にサイトへ反映されます。  
   - Private リポジトリでも同じ手順で公開できます（2024 年時点の GitHub Private Pages 対応）。アクセス制限を掛けたい場合は、組織アカウントでメンバー限定にするか、別ホスティングを利用してください。

#### Vercel / Netlify / Cloudflare Pages

1. 各サービスのダッシュボードで「New Project」を選択し、GitHub リポジトリを連携します。
2. Build Command は空欄（または `npm run build` などを無効化）、Output Directory は `/` のままにしてデプロイを開始します。
3. 自動で https 対応のプレビュー URL が発行され、問題がなければ独自ドメインを割り当てます。

#### Render（Static Site）

1. Render にログインし、Dashboard → **New** → **Static Site** を選択します。
2. GitHub/GitLab リポジトリを接続し、Build Command を空欄、Publish Directory に `.`（ピリオド）を指定します。`/` を設定するとビルド時にエラーになるため注意してください。
3. デプロイが完了すると `https://<your-service>.onrender.com` の URL が発行されます。地図とスコア編集が意図通りに動作するか確認してください。

### 4. 運用時のポイント

- CDN から取得している MapLibre のスタイル URL（`https://demotiles.maplibre.org/style.json`）は無料で利用できますが、将来的に独自スタイルを使いたい場合はホスティング先に合わせて差し替えてください。
- `data/` 以下の GeoJSON を更新する場合は、ブラウザキャッシュにより反映が遅れることがあります。ファイル名にバージョン番号を付ける、もしくは HTTP キャッシュ制御ヘッダーを調整すると確実です。
- 複数人でスコアを共有したい場合は、バックエンドや BaaS（Supabase / Firebase など）に保存先を切り替えることを検討してください。

## 使い方

1. 上部タブから「世界」「日本の都道府県」「日本の市区町村」を切り替えます。
2. マップ上の領域（国・都道府県・市区町村）または一覧行をクリック/Enter キーで編集ダイアログを開きます。
3. ダイアログで滞在実績を入力すると推奨スコアが表示されます。内容を確認し「保存」を押してください。
4. 右上の「CSV エクスポート」で現在のスコアをダウンロードできます。
5. 市区町村を追加する場合は地図上をクリックするか、CSV/JSON をインポートしてください（クリック時は最寄りポリゴンから自治体を推定します）。

## 公開方法（HP・アプリ化への第一歩）

本プロジェクトは完全な静的アプリケーションとして動作します。`index.html`・`styles.css`・`app.js` と `data/` 以下の GeoJSON を同じディレクトリに置くだけで完結するため、以下のような方法で簡単に公開できます。

### ローカルでの確認

- `index.html` を直接ブラウザで開く（最も手軽な方法）。
- もしくは `python -m http.server 8000` などの簡易サーバーを立ち上げ、`http://localhost:8000` にアクセスすると、ファイル構成を変えずに本番と同じ URL 体系で確認できます。

### 静的ホスティングサービスに配置する

| サービス | 手順概要 |
| --- | --- |
| GitHub Pages | リポジトリを GitHub に push → Repository Settings → Pages で `main` ブランチを公開。必要に応じて `docs/` フォルダにファイルを置く。 |
| Vercel / Netlify / Cloudflare Pages | GitHub リポジトリをインポートし、ビルド設定をスキップ（`index.html` をそのまま配信）。デプロイ後は自動で HTTPS 対応の URL が発行され、独自ドメインも設定できます。 |
| Render (Static Site) | Dashboard → New → Static Site からこのリポジトリを選択し、Build Command を空欄、Publish Directory を `.`（ルートディレクトリ）に設定してデプロイ。 |

いずれのサービスでも追加の API キーや専用サーバー構築は不要です。MapLibre GL のスタイル（`https://demotiles.maplibre.org/style.json`）は公開 URL を参照しており、無料で利用できます。

### 継続的な記録・ランキングを行いたい場合

- ブラウザ `localStorage` では端末ごとにデータが分かれるため、ユーザー単位の記録を共有したい場合はバックエンドを用意します。Supabase や Firebase、あるいは自前の REST API（例: FastAPI、Next.js API Routes）を用意し、ダイアログ保存時にデータを送信します。
- Web アプリを PWA 化すると、スマートフォンのホーム画面に追加してネイティブアプリのように利用できます。更に Expo（React Native）や Capacitor を使えば App Store / Google Play への配信も可能です。

まずは静的ホスティングで「HP」として公開し、必要に応じてバックエンドや認証を追加する流れが最も手軽です。

## データ更新とマップタイル

- 世界データと都道府県のメタデータは `scripts/` 配下の Python スクリプトで生成しています。
  - `python scripts/generate_countries.py`
  - `python scripts/generate_prefectures.py`
- 市区町村の初期データは `data/japan-municipalities-sample.json` に保存されています。全市区町村を取り込む場合は同形式の JSON もしくは `code,name,prefecture` 列を持つ CSV をインポートしてください。
- 地図の描画には [MapLibre GL JS](https://maplibre.org/) を利用し、スタイルは `https://demotiles.maplibre.org/style.json` を参照しています。
- 都道府県・市区町村ポリゴンは国土地理院の GeoJSON 公開データを直接取得しています（ネットワークアクセスが必要です）。

## ライセンス

プロジェクトのソースコードは MIT ライセンスです。収録データの元となる ISO コードおよびタイムゾーンデータはそれぞれのライセンスに従います。
