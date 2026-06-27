const { Server } = require('socket.io');
const { db } = require('./db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');

let io = null;

function chatRoom(country, city) {
  return `chat:${country}:${city || ''}`;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      socket.user = null;
      return next();
    }
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', ({ country, city }) => {
      if (!country) return;
      socket.leaveAll();
      socket.join(chatRoom(country, city || ''));
      socket.data.country = country;
      socket.data.city = city || '';
    });

    socket.on('send_message', async ({ message, country, city }) => {
      if (!socket.user) {
        socket.emit('error', { error: 'Login required' });
        return;
      }
      const user = db.prepare('SELECT username, verified_email, account_type, status FROM users WHERE id = ?').get(socket.user.id);
      if (!user?.verified_email) {
        socket.emit('error', { error: 'Verify your email first' });
        return;
      }
      if (user.status === 'banned') {
        socket.emit('error', { error: 'Account suspended' });
        return;
      }
      if (!message?.trim() || !country) return;

      const id = uuidv4();
      const now = new Date().toISOString();
      const cityVal = city && String(city).trim() ? String(city).trim() : null;
      const channel = cityVal ? `${country}|${cityVal}` : country;

      db.prepare(`INSERT INTO chat_messages (id, user_id, username, message, category, country, city, created_at) VALUES (?,?,?,?,?,?,?,?)`)
        .run(id, socket.user.id, user.username, message.trim(), channel, country, cityVal, now);

      const payload = {
        id, user_id: socket.user.id, username: user.username,
        message: message.trim(), country, city: cityVal,
        account_type: user.account_type, created_at: now
      };

      io.to(chatRoom(country, cityVal || '')).emit('new_message', payload);
      socket.emit('message_saved', { id });
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO, chatRoom };