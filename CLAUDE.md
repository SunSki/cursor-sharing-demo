# LiveCursors — プロジェクトコンテキスト

## 何を作っているか

既存のWebサイトにリアルタイムカーソル共有を追加できるセルフホスト型パッケージ。  
npm公開はせず、tarball形式で自分のプロジェクトに再利用する方針。

## リポジトリ

- GitHub: https://github.com/SunSki/cursor-sharing-demo（アカウント: SunSki）
- デプロイ: https://cursor-sharing-demo.onrender.com（Render 無料プラン）
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
<script src="https://cursor-sharing-demo.onrender.com/livecursors.js"
        data-server="https://cursor-sharing-demo.onrender.com"
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

## Chrome拡張機能

`extension/` フォルダ。サイト側に何も入れなくても拡張機能ユーザー同士でカーソルを共有できる。

- content script が socket.io + livecursors.js を全ページに注入（同梱）
- ルーム = `origin + pathname`
- ポップアップでON/OFF・表示名設定
- `extension/lib/livecursors.js` は `packages/client/livecursors.js` のコピー → **片方を変えたらもう片方も同期すること**

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

## 主要ドキュメント

- `README.md` — 概要と使い方（日本語）
- `INSTALL.md` — インストール手順書（方法A/B 両方、日本語）
- `test-site/TEST_LOG.md` — tarball インストールの動作確認ログ
- `extension/README.md` — Chrome拡張機能の使い方
