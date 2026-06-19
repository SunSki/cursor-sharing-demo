'use strict';

const { Server } = require('socket.io');

/**
 * Attach a real-time cursor-sharing relay to an existing Node HTTP server.
 *
 *   const { attachCursors } = require('@livecursors/server');
 *   attachCursors(httpServer, { path: '/livecursors', cors: { origin: '*' } });
 *
 * Clients join a `room` (the @livecursors/client picks one per page URL by
 * default) and cursor messages are broadcast only within that room, so
 * different sites and pages stay isolated. The server is payload-agnostic:
 * it relays whatever the client sends (e.g. { path, rx, ry, name, color })
 * and stamps the sender's socket id.
 *
 * @param {import('http').Server} httpServer
 * @param {object} [options]
 * @param {string} [options.path='/livecursors']  Socket.io mount path.
 * @param {object} [options.cors]                  Socket.io CORS config.
 * @param {object} [options.io]                    Extra Socket.io server options.
 * @returns {import('socket.io').Server} the Socket.io server instance.
 */
function attachCursors(httpServer, options = {}) {
  const path = options.path || '/livecursors';

  const io = new Server(httpServer, {
    path,
    serveClient: false,
    cors: options.cors,
    // Tiny, frequent cursor frames: compression costs more CPU than it saves.
    perMessageDeflate: false,
    ...(options.io || {}),
  });

  const counts = new Map(); // room -> number of connected clients

  function presence(room, delta) {
    const next = Math.max(0, (counts.get(room) || 0) + delta);
    if (next === 0) counts.delete(room);
    else counts.set(room, next);
    io.to(room).emit('presence', { count: next });
  }

  io.on('connection', (socket) => {
    let room = null;

    socket.on('join', (r) => {
      if (typeof r !== 'string' || !r) return;
      if (room) { socket.leave(room); presence(room, -1); }
      room = r;
      socket.join(room);
      presence(room, +1);
    });

    socket.on('cursor', (data) => {
      if (!room || !data || typeof data !== 'object') return;
      socket.to(room).emit('cursor', { ...data, id: socket.id });
    });

    socket.on('cursor-leave', () => {
      if (room) socket.to(room).emit('cursor-leave', { id: socket.id });
    });

    socket.on('disconnect', () => {
      if (!room) return;
      socket.to(room).emit('cursor-leave', { id: socket.id });
      presence(room, -1);
    });
  });

  return io;
}

module.exports = { attachCursors };
