const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { canAccess, canSend, findOrCreate } = require('../utils/conversationAccess');

const PARTICIPANT_FIELDS = 'firstName lastName avatar role';

// ── Shared helpers (reused by REST controller AND socket handlers) ──────────────

// Persist a message and update the conversation snapshot + unread counters.
async function persistMessage(convo, senderId, rawText) {
  const text = String(rawText).trim();
  const message = await Message.create({
    conversation: convo._id,
    sender: senderId,
    text,
    readBy: [senderId]
  });

  convo.lastMessage = text.slice(0, 200);
  convo.lastMessageAt = new Date();
  if (!convo.unread) convo.unread = new Map();

  const senderStr = String(senderId);
  for (const p of convo.participants) {
    const pid = String(p._id || p);
    if (pid !== senderStr) convo.unread.set(pid, (convo.unread.get(pid) || 0) + 1);
  }
  // Support: admin is not a participant — track an 'admin' unread bucket for opener messages.
  if (convo.type === 'support' && senderStr === String(convo.user)) {
    convo.unread.set('admin', (convo.unread.get('admin') || 0) + 1);
  }

  await convo.save();
  return message;
}

// Reset unread for the reader (admins clear the support 'admin' bucket).
async function markReadFor(convo, user) {
  if (!convo.unread) convo.unread = new Map();
  if (convo.type === 'support' && user.role === 'admin') {
    convo.unread.set('admin', 0);
  } else {
    convo.unread.set(String(user._id), 0);
  }
  await convo.save();
}

// ── REST handlers ───────────────────────────────────────────────────────────────

// GET /api/conversations  (?type=support for admin → all support conversations)
exports.getConversations = asyncHandler(async (req, res) => {
  const { type } = req.query;

  let filter;
  if (type === 'support' && req.user.role === 'admin') {
    filter = { type: 'support' };
  } else {
    filter = { participants: req.user._id };
    if (type) filter.type = type;
  }

  const conversations = await Conversation.find(filter)
    .populate('buyer seller courier user', PARTICIPANT_FIELDS)
    .populate('product', 'name images')
    .populate('order', 'orderNumber status')
    .sort({ lastMessageAt: -1 });

  res.status(200).json({ success: true, count: conversations.length, conversations });
});

// POST /api/conversations  { type, productId?, orderId?, sellerId? }
exports.createConversation = asyncHandler(async (req, res) => {
  const convo = await findOrCreate(req.user, req.body);
  const conversation = await Conversation.findById(convo._id)
    .populate('buyer seller courier user', PARTICIPANT_FIELDS)
    .populate('product', 'name images')
    .populate('order', 'orderNumber status');
  res.status(201).json({ success: true, conversation });
});

// GET /api/conversations/:id/messages
exports.getMessages = asyncHandler(async (req, res) => {
  const convo = await Conversation.findById(req.params.id)
    .populate('buyer seller courier user', PARTICIPANT_FIELDS)
    .populate('product', 'name images')
    .populate('order', 'orderNumber status');
  if (!convo) throw new ApiError(404, 'Söhbət tapılmadı');
  if (!canAccess(req.user, convo)) throw new ApiError(403, 'Bu söhbətə giriş icazəniz yoxdur');

  const messages = await Message.find({ conversation: convo._id })
    .populate('sender', PARTICIPANT_FIELDS)
    .sort({ createdAt: 1 });

  res.status(200).json({ success: true, conversation: convo, messages });
});

// POST /api/conversations/:id/messages  { text }  (REST fallback for sockets)
exports.postMessage = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) throw new ApiError(400, 'Mesaj boş ola bilməz');

  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw new ApiError(404, 'Söhbət tapılmadı');

  const check = await canSend(req.user, convo);
  if (!check.ok) throw new ApiError(check.status, check.message);

  const created = await persistMessage(convo, req.user._id, text);
  const message = await created.populate('sender', PARTICIPANT_FIELDS);
  res.status(201).json({ success: true, message });
});

// PUT /api/conversations/:id/read
exports.markRead = asyncHandler(async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) throw new ApiError(404, 'Söhbət tapılmadı');
  if (!canAccess(req.user, convo)) throw new ApiError(403, 'İcazə yoxdur');

  await markReadFor(convo, req.user);
  res.status(200).json({ success: true });
});

exports.persistMessage = persistMessage;
exports.markReadFor = markReadFor;
