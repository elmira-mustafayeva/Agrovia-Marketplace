const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const registerChatHandlers = require('./chatHandlers');

// Initialize the authenticated Socket.io layer on top of the existing HTTP server.
function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5175',
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Handshake JWT auth — mirrors middleware/auth.js (token = { id, role }).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error('UNAUTHORIZED'));
      socket.user = user;
      return next();
    } catch (e) {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    // Personal room for unread/badge pushes; admins also join a shared room for support.
    socket.join(`user:${socket.user._id}`);
    if (socket.user.role === 'admin') socket.join('role:admin');

    registerChatHandlers(io, socket);
  });

  return io;
}

module.exports = initSocket;
