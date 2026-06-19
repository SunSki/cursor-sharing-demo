const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, 'public')));

let userCount = 0;

io.on('connection', (socket) => {
  userCount++;
  io.emit('user-count', userCount);

  socket.on('cursor', (data) => {
    socket.broadcast.emit('cursor', { ...data, id: socket.id });
  });

  socket.on('cursor-leave', () => {
    socket.broadcast.emit('cursor-leave', { id: socket.id });
  });

  socket.on('disconnect', () => {
    userCount--;
    io.emit('user-left', { id: socket.id });
    io.emit('user-count', userCount);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
