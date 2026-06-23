const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// CORS preflight requests must never consume quota.
const skipOptions = (req) => req.method === 'OPTIONS';
const body = (message) => ({ success: false, message });
const TOO_MANY = 'Çox sayda sorğu göndərildi. Bir az sonra yenidən cəhd edin.';

// General API limiter. Conversations have their own (higher) budget, so they are
// skipped here to avoid the general budget throttling normal chat/support usage.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 500 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: body(TOO_MANY),
  skip: (req) => req.method === 'OPTIONS' || req.originalUrl.startsWith('/api/conversations'),
});

// Chat / support — React Query list + messages + mark-read add up fast during normal use.
const conversationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1000 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: body(TOO_MANY),
  skip: skipOptions,
});

// Anti-spam cap on actually sending messages (separate from read traffic).
const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: body('Çox sürətli mesaj göndərirsiniz. Bir az gözləyin.'),
  skip: skipOptions,
});

// Stricter limiter for sensitive auth routes that don't already have a dedicated one
// (login / OTP / forgot / resend already have their own stricter limiters in routes/auth.js).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: body('Çox sayda cəhd. Bir az sonra yenidən cəhd edin.'),
  skip: skipOptions,
});

module.exports = { apiLimiter, conversationLimiter, messageSendLimiter, authLimiter };
