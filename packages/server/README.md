# @livecursors/server

Attach a real-time cursor-sharing relay to any Node HTTP server.

```js
const { createServer } = require('http');
const { attachCursors } = require('@livecursors/server');

const httpServer = createServer(app);
attachCursors(httpServer, { path: '/livecursors' });
httpServer.listen(3000);
```

## `attachCursors(httpServer, options?)`

| option | default          | description                          |
|--------|------------------|--------------------------------------|
| `path` | `/livecursors`   | Socket.io mount path (match client). |
| `cors` | —                | Socket.io CORS config.               |
| `io`   | —                | Extra Socket.io server options.      |

Returns the Socket.io `Server` instance. Clients `join` a room; cursor messages
are broadcast only within that room. The relay is payload-agnostic and stamps
each message with the sender's socket id. Pair with
[`@livecursors/client`](https://www.npmjs.com/package/@livecursors/client).
