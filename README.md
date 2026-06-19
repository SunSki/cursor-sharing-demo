# LiveCursors

Real-time cursor sharing you can add to an existing website. Self-hosted, two
small packages, no SaaS.

- **`@livecursors/server`** — attach a relay to your existing Node HTTP server.
- **`@livecursors/client`** — one `<script>` tag in your pages.

Cursors are shared as *which element + relative position inside it*, so they
stay accurate across different screen sizes, responsive reflow, and scroll
position. Cursor traffic is scoped per room (one room per page URL by default),
so different pages and sites stay isolated.

## Add it to your site

**1. Server** — in your existing app (anything with a Node `http.Server`):

```js
const { createServer } = require('http');
const { attachCursors } = require('@livecursors/server');

const httpServer = createServer(app);          // your Express/Koa/etc. app
attachCursors(httpServer, { path: '/livecursors' });
httpServer.listen(3000);
```

**2. Client** — one line in the pages you want shared:

```html
<script src="https://cdn.jsdelivr.net/npm/@livecursors/client"
        data-server="https://your-app.com"
        data-room="auto"
        data-path="/livecursors"></script>
```

`data-server=""` means "same origin". `data-room="auto"` scopes the room to the
current page URL. That's it.

### Options

Client (`data-*` attributes, or `init({...})` if you `import` it):

| attribute      | default        | meaning                                   |
|----------------|----------------|-------------------------------------------|
| `data-server`  | same origin    | origin of your relay server               |
| `data-path`    | `/livecursors` | must match the server's `path`            |
| `data-room`    | `auto`         | `auto` = per-page; or any string          |
| `data-name`    | random         | label shown on your cursor                |
| `data-color`   | random         | cursor color                              |
| `data-throttle`| `32`           | min ms between sent updates               |

Add `data-lc-id="checkout-button"` to important elements for rock-solid
anchoring on dynamic / SPA pages (preferred over the structural fallback).
Put a presence counter anywhere with `<span data-livecursors-count></span>`.

## This repo

A workspaces monorepo. The root is a runnable demo site (a fake landing page)
that self-hosts the relay exactly as above:

```bash
npm install
npm start        # http://localhost:3000 — open in two windows
```

```
packages/server   @livecursors/server  (attachCursors)
packages/client   @livecursors/client  (livecursors.js)
server.js         demo: Express + attachCursors
public/index.html demo page using the client
```

## Notes

- The client auto-loads the socket.io browser library from a CDN; override with
  `data-socketio="..."` to self-host that too.
- Same-DOM assumption: clients on the same room should render the same markup
  (same URL/build). For pages that differ, anchor with `data-lc-id`.
