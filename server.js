// Demo site for @livecursors. Shows how a site owner self-hosts the relay:
// attach it to an existing Express/HTTP server in a couple of lines.
const express = require('express');
const { createServer } = require('http');
const path = require('path');
const { attachCursors } = require('@livecursors/server');

const app = express();
const httpServer = createServer(app);

app.use(express.static(path.join(__dirname, 'public')));

// Serve the browser client — CORS header lets any site load this script.
app.get('/livecursors.js', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.type('application/javascript');
  res.sendFile(require.resolve('@livecursors/client'));
});

// Relay — CORS open so any external site can connect to this relay server.
attachCursors(httpServer, {
  path: '/livecursors',
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`http://localhost:${PORT}`));
