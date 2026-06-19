# @livecursors/client

Drop-in real-time cursor sharing for any website. Pairs with
[`@livecursors/server`](https://www.npmjs.com/package/@livecursors/server).

```html
<script src="https://cdn.jsdelivr.net/npm/@livecursors/client"
        data-server="https://your-app.com"
        data-room="auto"
        data-path="/livecursors"></script>
```

Or as a module:

```js
import { init } from '@livecursors/client';
const session = init({ server: 'https://your-app.com', room: location.pathname });
// session.destroy() to tear down
```

Cursors are sent as `{ path, rx, ry }` — the element under the pointer plus a
0..1 position inside it — so they stay accurate across different screen sizes,
reflow, and scroll. Add `data-lc-id="..."` to key elements for stable anchoring
on dynamic/SPA pages. A `[data-livecursors-count]` element is auto-filled with
the live viewer count.

See the [config table](https://github.com/SunSki/cursor-sharing-demo#options)
for all `data-*` / `init()` options.
