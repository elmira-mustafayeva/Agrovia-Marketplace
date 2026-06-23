const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  getMessages,
  postMessage,
  markRead
} = require('../controllers/conversationController');
const { protect } = require('../middleware/auth');
const { messageSendLimiter } = require('../middleware/rateLimiters');

router.get('/', protect, getConversations);
router.post('/', protect, createConversation);
router.get('/:id/messages', protect, getMessages);
router.post('/:id/messages', protect, messageSendLimiter, postMessage);
router.put('/:id/read', protect, markRead);

module.exports = router;
