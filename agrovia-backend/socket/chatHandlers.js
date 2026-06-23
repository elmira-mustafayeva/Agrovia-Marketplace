const Conversation = require('../models/Conversation');
const { canAccess, canSend } = require('../utils/conversationAccess');
const { persistMessage, markReadFor } = require('../controllers/conversationController');

const SENDER_FIELDS = 'firstName lastName avatar role';

// Register chat events for an authenticated socket. Every room join + send is
// re-authorized server-side against the DB (never trust the client).
module.exports = function registerChatHandlers(io, socket) {
  const user = socket.user;

  socket.on('conversation:join', async (conversationId, ack) => {
    try {
      const convo = await Conversation.findById(conversationId);
      if (!convo || !canAccess(user, convo)) {
        if (typeof ack === 'function') ack({ ok: false, message: 'İcazə yoxdur' });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false });
    }
  });

  socket.on('conversation:leave', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('message:send', async (payload = {}, ack) => {
    try {
      const { conversationId, text } = payload;
      if (!text || !text.trim()) {
        if (typeof ack === 'function') ack({ ok: false, message: 'Mesaj boşdur' });
        return;
      }
      const convo = await Conversation.findById(conversationId);
      if (!convo) {
        if (typeof ack === 'function') ack({ ok: false, message: 'Söhbət tapılmadı' });
        return;
      }
      const check = await canSend(user, convo);
      if (!check.ok) {
        if (typeof ack === 'function') ack({ ok: false, message: check.message });
        return;
      }

      const created = await persistMessage(convo, user._id, text);
      const message = await created.populate('sender', SENDER_FIELDS);

      io.to(`conversation:${conversationId}`).emit('message:new', { conversationId, message });

      // Poke each participant's personal room (+ admins for support) for unread/list refresh.
      for (const p of convo.participants) {
        io.to(`user:${String(p._id || p)}`).emit('conversation:updated', { conversationId });
      }
      if (convo.type === 'support') {
        io.to('role:admin').emit('conversation:updated', { conversationId });
      }

      if (typeof ack === 'function') ack({ ok: true, message });
    } catch (e) {
      if (typeof ack === 'function') ack({ ok: false });
    }
  });

  socket.on('message:read', async (conversationId) => {
    try {
      const convo = await Conversation.findById(conversationId);
      if (!convo || !canAccess(user, convo)) return;
      await markReadFor(convo, user);
      io.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        userId: String(user._id)
      });
    } catch (e) {
      /* ignore */
    }
  });

  socket.on('typing:start', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:start', { conversationId, userId: String(user._id) });
  });
  socket.on('typing:stop', (conversationId) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId: String(user._id) });
  });
};
