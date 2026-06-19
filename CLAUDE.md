# LiveCursors — プロジェクトコンテキスト

## 何を作っているか

既存のWebサイトにリアルタイムカーソル共有を追加できるセルフホスト型パッケージ。  
npm公開はせず、tarball形式で自分のプロジェクトに再利用する方針。

## リポジトリ

- GitHub: https://github.com/SunSki/dotsync（アカウント: SunSki）
- デプロイ: https://dotsync-8an8.onrender.com（Render 無料プラン）
- ローカル: `/Users/hibinatsuki/Documents/ClaudeCowork/cursorPosition/`

## パッケージ構成（npm workspaces モノレポ）

```
packages/server/index.js       @livecursors/server — attachCursors() を提供
packages/client/livecursors.js @livecursors/client — ブラウザ用ドロップインスクリプト
server.js                      デモサイト（Express + attachCursors）
public/index.html              デモページ（Halo というダミーSaaSのランディングページ）
extension/                     Chrome拡張機能（MV3）
test-site/                     tarball からインストールしてテストした環境（git管理外）
dist/                          npm pack で生成した tarball（git管理外）
```

## 使い方（2パターン）

### 方法A — script 1行（npm/Node不要、推奨）
```html
<script src="https://dotsync-8an8.onrender.com/livecursors.js"
        data-server="https://dotsync-8an8.onrender.com"
        data-room="auto" data-path="/livecursors"></script>
```

### 方法B — 自前サーバーに組み込む
```js
// npm install でtarballから入れる（INSTALL.md 参照）
const { attachCursors } = require('@livecursors/server');
attachCursors(httpServer, { path: '/livecursors', cors: { origin: '*' } });
```

## カーソル位置共有の仕組み（重要な設計判断）

**絶対ピクセル座標ではなく `{ path, rx, ry }` で送信する。**

- `path`: カーソル下のDOM要素への構造的CSSセレクタ
- `rx, ry`: その要素内での相対位置（0〜1）
- 受信側が同じセレクタで自分のDOMから要素を解決して配置する

→ 画面サイズ・レスポンシブリフロー・スクロール位置が違っても同じオブジェクトを指せる。  
SPA等で構造が変わる要素には `data-lc-id="任意のID"` でアンカーを明示するとより安定。

**過去に失敗したアプローチ（やり直さないために）:**
- `x / window.innerWidth` の正規化 → 画面サイズが違うとずれる
- 固定1440×900キャンバス + CSS scale → 余白でカーソルが凍結した

## 画面外カーソルの表示

相手のカーソルが上下にスクロールアウトしたとき、画面端に ▲/▼ + 名前 のマーカーをピン留めする。  
`livecursors.js` の `place()` 関数内で `y < 0 || y > H` を判定して切り替え。

## Chrome拡張機能（DotSync）

`extension/` フォルダ。サイト側に何も入れなくても拡張機能ユーザー同士でドット（位置マーカー）を共有できる。拡張機能名は **DotSync**（グローバル変数は `window.DotSync`）。

- content script が socket.io + livecursors.js を全ページに注入（同梱）
- **ルーム = `origin + pathname + ":" + ルームコード`**
- ポップアップで**ルームコード**（最大20文字・「生成」でランダム作成）・表示名を設定
- **ルームコードが空欄のとき機能OFF**（ON/OFFトグルは廃止、コード有無で制御）
- ルームコードは全サイト共通の1つ、`chrome.storage.sync` に保存
- `extension/lib/livecursors.js` は `packages/client/livecursors.js` のコピー → **片方を変えたらもう片方も同期すること**

## サーバー負荷削減（実装済み）

クライアント（livecursors.js）側:
- presence > 1 のときだけ送信（1人なら通信ゼロ）
- タブ非表示（visibilitychange）で送信停止
- 5秒idleで送信停止（動かすと再開）
- throttle 50ms（20fps）、ペイロード短縮キー（p/x/y/n/c）＋rx/ryを小数3桁に丸め

サーバー（@livecursors/server）側:
- `perMessageDeflate: false`（小さく頻繁なフレームでは圧縮が逆効果）
- クライアントは WebSocket 優先（transports: ['websocket','polling']）

**見送った施策**: サーバー側バッチ配信（O(N²)→O(N)）、ルーム人数上限。多人数が現実に問題化したら検討。

**注意**: cursorイベントのペイロードは短縮キー（p/x/y/n/c）。送受信の両方を同時に変えること。

## i18n（拡張機能の多言語対応）

拡張機能UIはChrome i18n機構で英語（デフォルト）と日本語に対応している。

**唯一の編集ファイル: `extension/_locales/strings.json`**  
- en/ja両方を1箇所に記述（`en/messages.json` と `ja/messages.json` は生成物）
- 文字列を追加・変更したら必ず `npm run locales` を実行してから commit する

```bash
# 文字列追加・変更後の手順
npm run locales        # en/ と ja/ を再生成
npm run locales:check  # CI的な検証（ずれていれば exit 1）
```

**LLMが文字列を追加・変更するとき**: `strings.json` だけ編集し、`npm run locales` を実行する。`en/messages.json` や `ja/messages.json` を直接編集しない。

プレースホルダー（動的な値）は `strings.json` の `placeholders` キーに1度だけ書けばよい（両言語で共有される）。

## tarball 更新の手順

```bash
npm run pack              # dist/ に tgz 生成
cp packages/client/livecursors.js extension/lib/livecursors.js  # 拡張機能側も同期
```

## ローカル起動

```bash
npm install && npm start  # http://localhost:3000
# テストサイト（別ポート）
node test-site/server.js  # http://localhost:4000
```

## デプロイ

GitHub push で Render が自動ビルド（autoDeploy: yes）。  
`node server.js` が起動コマンド。Render 無料プランは15分でスリープ。

## デザインシステム

**ブランド名: DotSync**。ロゴ作成済み。

カラートークンは `design-tokens.json`（リポジトリルート）が唯一の管理場所。

| トークン | 値 | 用途 |
|---|---|---|
| primary | `#00C2A8` | ボタン・アクティブ状態・アクセント |
| primaryDark | `#00A892` | ホバー時 |
| primaryLight | `#E6FAF8` | アクティブ背景 |
| primaryMid | `#7DDFD4` | ホバーボーダー |
| surfaceDark | `#1a1a2e` | ヘッダー・ダーク背景 |

**拡張機能 (`extension/popup.html`)** は CSS カスタムプロパティ（`--primary` 等）でトークンを参照している。  
新しくUIに色を追加するときは `design-tokens.json` を参照し、既存トークンを使うこと。

## 主要ドキュメント

- `README.md` — 概要と使い方（日本語）
- `INSTALL.md` — インストール手順書（方法A/B 両方、日本語）
- `test-site/TEST_LOG.md` — tarball インストールの動作確認ログ
- `extension/README.md` — Chrome拡張機能の使い方
