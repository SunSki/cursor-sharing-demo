# LiveCursors — インストール手順書

既存のWebサイトにリアルタイムカーソル共有を追加する手順です。  
用途に応じて **2つの方法** があります。

---

## 方法A　`<script>` 1行だけ（最も簡単）

**Node.js 不要。`index.html` だけのサイトにも追加できます。**

Render に常時稼働しているリレーサーバーを使います。

```html
<!-- </body> の直前に追加するだけ -->
<script src="https://cursor-sharing-demo.onrender.com/livecursors.js"
        data-server="https://cursor-sharing-demo.onrender.com"
        data-room="auto"
        data-path="/livecursors"></script>
```

これだけで完了です。`livecursors.js` 本体もリレーサーバーから配信されるので、  
ファイルのコピーや `npm install` は一切不要です。

> **注意**: Render の無料プランは15分無操作でスリープします。  
> 最初のアクセスから起動まで数十秒かかることがあります。

### 動作確認

同じURLをブラウザの2つのウィンドウで開き、片方でマウスを動かすと  
もう片方にカーソルが表示されれば成功です。

---

## 方法B　自分のサーバーに組み込む

Node.js サーバーを自前で用意する場合の手順です。  
リレーサーバーを自分で管理したい・CORS を制限したい場合に選択します。

### 前提条件

| 項目 | 要件 |
|------|------|
| Node.js | 18 以上 |
| npm | 8 以上 |
| 既存サーバー | Node.js の `http.Server` を持つもの（Express / Fastify / Koa 等） |

### Step 1: tarball を生成する

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

### Step 2: 対象プロジェクトにインストールする

組み込みたいプロジェクトのルートで実行します。

```bash
npm install \
  /path/to/cursor-sharing-demo/dist/livecursors-server-0.1.0.tgz \
  /path/to/cursor-sharing-demo/dist/livecursors-client-0.1.0.tgz
```

socket.io など依存パッケージも自動でインストールされます。

`package.json` に書いておくと `npm install` だけで入ります：

```json
{
  "dependencies": {
    "@livecursors/server": "file:../cursor-sharing-demo/dist/livecursors-server-0.1.0.tgz",
    "@livecursors/client": "file:../cursor-sharing-demo/dist/livecursors-client-0.1.0.tgz"
  }
}
```

### Step 3: サーバー側に組み込む

既存の `http.Server` に `attachCursors()` を追加します。

```js
const express = require('express');
const { createServer } = require('http');
const { attachCursors } = require('@livecursors/server'); // ← 追加

const app = express();
const httpServer = createServer(app);

// クライアントスクリプトを配信するルート
app.get('/livecursors.js', (_req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.type('application/javascript');
  res.sendFile(require.resolve('@livecursors/client'));
});

// リレーを起動（これ1行）
attachCursors(httpServer, { path: '/livecursors' });

httpServer.listen(3000);
```

**外部サイトからの接続を許可する場合（CORS）:**

```js
attachCursors(httpServer, {
  path: '/livecursors',
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
```

### Step 4: ページ側に組み込む

```html
<!-- 自分のサーバーが同一オリジンの場合 -->
<script src="/livecursors.js"
        data-server=""
        data-room="auto"
        data-path="/livecursors"></script>

<!-- 別オリジンのリレーサーバーを使う場合 -->
<script src="https://your-relay.example.com/livecursors.js"
        data-server="https://your-relay.example.com"
        data-room="auto"
        data-path="/livecursors"></script>
```

### 動作確認

```bash
# ページが返る
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/

# クライアントスクリプトが返る
curl -o /dev/null -w '%{http_code}\n' http://localhost:3000/livecursors.js

# Socket.io ハンドシェイクが通る（リレーが起動している）
curl -o /dev/null -w '%{http_code}\n' 'http://localhost:3000/livecursors/?EIO=4&transport=polling'
```

3つ全て `200` が返れば正常です。

---

## 共通オプション

### `data-*` 属性一覧（クライアント側）

| 属性 | デフォルト | 説明 |
|------|------------|------|
| `data-server` | 同一オリジン | リレーサーバーのオリジン |
| `data-path` | `/livecursors` | `attachCursors` の `path` と合わせる |
| `data-room` | `auto` | `auto` = ページURLで自動分離。任意の文字列も可 |
| `data-name` | ランダム | カーソルに表示される名前 |
| `data-color` | ランダム | カーソルの色（CSS カラー文字列） |
| `data-throttle` | `32` | 送信間隔の最小値（ミリ秒） |

### 閲覧人数を表示する

```html
<span data-livecursors-count>1</span> 人が閲覧中
```

`data-livecursors-count` を付けた要素に人数が自動で書き込まれます。

### 重要な要素をピン留めする（SPA・動的ページ向け）

```html
<button data-lc-id="signup-button">登録する</button>
<section data-lc-id="pricing">...</section>
```

DOM 構造が動的に変わるページでは `data-lc-id` を付けると安定します。

---

## トラブルシューティング

### カーソルが表示されない

- ブラウザのコンソール（F12）にエラーが出ていないか確認
- `data-path` が `attachCursors` の `path` と一致しているか確認
- Socket.io ハンドシェイクの curl が `200` を返すか確認

### バージョンを上げた後に反映されない

```bash
# 1. このリポジトリで pack し直す
npm run pack

# 2. 使う側で package.json の file: パスのバージョン番号を更新して
npm install
```

---

## ファイル構成の参照

```
cursor-sharing-demo/
├── dist/
│   ├── livecursors-server-0.1.0.tgz   ← npm install に渡す tarball（方法B）
│   └── livecursors-client-0.1.0.tgz
├── packages/
│   ├── server/index.js                 ← @livecursors/server のソース
│   └── client/livecursors.js           ← @livecursors/client のソース
└── test-site/
    ├── TEST_LOG.md                     ← tarball インストールの動作確認ログ
    ├── server.js                       ← 方法B のサンプル実装
    ├── public/index.html               ← 方法B のサンプルページ
    └── frontend-only/index.html        ← 方法A のサンプル（<script>1行のみ）
```
