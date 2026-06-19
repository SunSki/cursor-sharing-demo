# LiveCursors

リアルタイムカーソル共有を既存のWebサイトに追加できるパッケージです。

- **`@livecursors/server`** — 既存の Node HTTP サーバーにリレーを追加
- **`@livecursors/client`** — `<script>` 1行でどのページにも組み込める

カーソル位置は「どのDOM要素の、その中の相対位置か」で送受信するため、  
画面サイズやレイアウトが異なっても同じオブジェクトを正確に指し示せます。  
ページURL単位でルームが自動分離されるので、サイトをまたいで混線しません。

---

## 使い方

### 方法A　`<script>` 1行だけ（最も簡単）

Node.js 不要。`index.html` だけのサイトにも追加できます。

```html
<script src="https://cursor-sharing-demo.onrender.com/livecursors.js"
        data-server="https://cursor-sharing-demo.onrender.com"
        data-room="auto"
        data-path="/livecursors"></script>
```

Render 上のリレーサーバーを使います。ファイルのコピーも npm も不要です。

### 方法B　自分のサーバーに組み込む

既存の Node.js サーバーにリレーを立てる場合。

**サーバー側:**
```js
const { attachCursors } = require('@livecursors/server');
attachCursors(httpServer, { path: '/livecursors' });
```

**ページ側:**
```html
<script src="/livecursors.js"
        data-server=""
        data-room="auto"
        data-path="/livecursors"></script>
```

詳細な手順は [INSTALL.md](./INSTALL.md) を参照してください。

---

## このリポジトリ

npm workspaces のモノレポです。ルートはデモサイト（ランディングページ風）で、  
両パッケージを実際に使って動かせます。

```bash
npm install
npm start   # http://localhost:3000 を複数ウィンドウで開くと動作確認できる
```

```
packages/server          @livecursors/server のソース（attachCursors）
packages/client          @livecursors/client のソース（livecursors.js）
server.js                デモ: Express + attachCursors
public/index.html        デモページ
test-site/               tarball からインストールした動作確認済み実装例
  ├─ TEST_LOG.md           インストール手順の確認ログ
  ├─ server.js             方法B のサンプル
  ├─ public/index.html     方法B のサンプルページ
  └─ frontend-only/        方法A のサンプル（<script>1行のみ）
      └─ index.html
```

## 自分のプロジェクトで再利用する（npm 公開なし）

```bash
npm run pack
# → dist/livecursors-{server,client}-0.1.0.tgz を生成
```

別プロジェクトで:
```bash
npm install /path/to/cursor-sharing-demo/dist/livecursors-server-0.1.0.tgz \
            /path/to/cursor-sharing-demo/dist/livecursors-client-0.1.0.tgz
```

`require('@livecursors/server')` が npm 経由と同じように使えます。

## Notes

- クライアントは socket.io をCDNから自動ロードします。`data-socketio="..."` でURLを上書き可能。
- 同じルームのクライアントは同一のHTMLを表示している前提です。DOM構造が動的に変わる場合は `data-lc-id` でアンカー要素を明示してください。
