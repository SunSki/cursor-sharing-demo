// Demo site for @livecursors. Shows how a site owner self-hosts the relay:
// attach it to an existing Express/HTTP server in a couple of lines.
const express = require('express');
const { createServer } = require('http');
const path = require('path');
const { attachCursors } = require('@livecursors/server');

const app = express();
const httpServer = createServer(app);

app.use(express.static(path.join(__dirname, 'public')));

// Serve the browser client straight from the package so the demo's
// <script src="/livecursors.js"> stays in sync with what we'd publish.
app.get('/livecursors.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(require.resolve('@livecursors/client'));
});

// The one integration line: real-time cursor relay on /livecursors.
attachCursors(httpServer, { path: '/livecursors' });

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`http://localhost:${PORT}`));
