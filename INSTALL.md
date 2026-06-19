# LiveCursors — インストール手順書

既存のWebサイトにリアルタイムカーソル共有を追加する手順です。  
`@livecursors/server`（サーバー側）と `@livecursors/client`（ブラウザ側）の2つのパッケージを使います。

---

## 前提条件

| 項目 | 要件 |
|------|------|
| Node.js | 18 以上 |
| npm | 8 以上 |
| 既存サーバー | Node.js の `http.Server` を持つもの（Express / Fastify / Koa 等） |

---

## Step 1: tarball を生成する

このリポジトリで1回だけ実行します。

```bash
cd /path/to/cursor-sharing-demo
npm install
npm run pack
```

`dist/` フォルダに2つのファイルが作られます：

```
dist/
├── livecursors-server-0.1.0.tgz
└── livecursors-client-0.1.0.tgz
```

> **次回以降**: バージョンアップしない限り再生成は不要です。

---

## Step 2: 対象プロジェクトにインストールする

組み込みたいプロジェクトのルートで実行します。

```bash
npm install \
  /path/to/cursor-sharing-demo/dist/livecursors-server-0.1.0.tgz \
  /path/to/cursor-sharing-demo/dist/livecursors-client-0.1.0.tgz
```

インストールされると `node_modules/@livecursors/` 以下に展開され、  
socket.io などの依存パッケージも自動でインストールされます。

### package.json に固定する場合

毎回パスを打ちたくない場合は `package.json` の `dependencies` に直接書いておくと `npm install` だけで入ります。

```json
{
  "dependencies": {
    "@livecursors/server": "file:../cursor-sharing-demo/dist/livecursors-server-0.1.0.tgz",
    "@livecursors/client": "file:../cursor-sharing-demo/dist/livecursors-client-0.1.0.tgz"
  }
}
```

---

## Step 3: サーバー側に組み込む

既存の `http.Server` に `attachCursors()` を1行追加するだけです。

```js
const express = require('express');
const { createServer } = require('http');
const { attachCursors } = require('@livecursors/server'); // ← 追加

const app = express();
const httpServer = createServer(app);

// ── 既存のルート定義はそのまま ──────────────────────────────

// クライアントスクリプトを配信するルート（静的ファイルとして置いても可）
app.get('/livecursors.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(require.resolve('@livecursors/client'));
});

attachCursors(httpServer, { path: '/livecursors' }); // ← 追加

httpServer.listen(3000);
```

### `attachCursors` のオプション

| オプション | デフォルト | 説明 |
|------------|------------|------|
| `path` | `/livecursors` | Socket.io のマウントパス。クライアント側の `data-path` と合わせる |
| `cors` | なし | Socket.io に渡す CORS 設定 (`{ origin: '*' }` など) |
| `io` | なし | その他の Socket.io サーバーオプション |

---

## Step 4: ページ側に組み込む

カーソル共有を有効にしたい HTML ページの **`</body>` 直前**に1行追加します。

```html
<script src="/livecursors.js"
        data-server=""
        data-room="auto"
        data-path="/livecursors"></script>
```

これだけで、同じURLを開いている全員のカーソルがリアルタイムで表示されます。

### `data-*` 属性の一覧

| 属性 | デフォルト | 説明 |
|------|------------|------|
| `data-server` | 同一オリジン | リレーサーバーのオリジン。同一サーバーなら `""` でOK |
| `data-path` | `/livecursors` | `attachCursors` の `path` と同じ値にする |
| `data-room` | `auto` | `auto` = ページURLごとに部屋を分ける。任意の文字列も指定可 |
| `data-name` | ランダム | カーソルに表示される名前 |
| `data-color` | ランダム | カーソルの色（CSS カラー文字列） |
| `data-throttle` | `32` | 送信間隔の最小値（ミリ秒）。小さいほどなめらか、大きいほど軽量 |

---

## オプション: 閲覧人数を表示する

`data-livecursors-count` 属性を付けた要素に、現在の閲覧人数が自動で書き込まれます。

```html
<span data-livecursors-count>1</span> 人が閲覧中
```

---

## オプション: 重要な要素をピン留めする（SPA・動的ページ向け）

LiveCursors はカーソル位置を「どの要素の中のどこか」という形で送信します。  
ページの構造が動的に変わる場合、重要な要素に `data-lc-id` を付けると  
DOM 構造が変わっても安定してその要素を参照できます。

```html
<button data-lc-id="signup-button">登録する</button>
<section data-lc-id="pricing">...</section>
```

---

## 動作確認

サーバーを起動後、以下の3つが全て `200` を返せば正常に動いています。

```bash
# ページが返る
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/

# クライアントスクリプトが返る
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/livecursors.js

# Socket.io ハンドシェイクが通る（リレーが起動している）
curl -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/livecursors/?EIO=4&transport=polling'
```

同じURLをブラウザの2つのウィンドウで開き、片方でマウスを動かすともう片方に  
カーソルが表示されれば成功です。

---

## トラブルシューティング

### カーソルが表示されない

- ブラウザのコンソール（F12）にエラーが出ていないか確認
- `data-path` の値が `attachCursors` の `path` と一致しているか確認
- Socket.io ハンドシェイクの curl が `200` を返すか確認

### 別オリジンのサーバーに接続したい

```html
<script src="https://your-relay.example.com/livecursors.js"
        data-server="https://your-relay.example.com"
        data-path="/livecursors"></script>
```

サーバー側に CORS を設定します：

```js
attachCursors(httpServer, {
  path: '/livecursors',
  cors: { origin: 'https://your-site.example.com' }
});
```

### バージョンを上げた後に反映されない

```bash
# 1. このリポジトリで pack し直す
npm run pack

# 2. 使う側で package.json の file: パスのバージョン番号を更新し
npm install
```

---

## ファイル構成の参照

```
cursor-sharing-demo/
├── dist/
│   ├── livecursors-server-0.1.0.tgz   ← npm install に渡す tarball
│   └── livecursors-client-0.1.0.tgz
├── packages/
│   ├── server/index.js                 ← @livecursors/server のソース
│   └── client/livecursors.js           ← @livecursors/client のソース
└── test-site/                          ← 動作確認済みのサンプル実装
    ├── TEST_LOG.md
    ├── server.js
    └── public/index.html
```

`test-site/` は実際に tarball からインストールして動作確認した実装例です。  
組み込みに迷ったときはそちらを参照してください。
