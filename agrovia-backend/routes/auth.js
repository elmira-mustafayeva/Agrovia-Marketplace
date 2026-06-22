const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  register,
  login,
  getMe,
  updateProfile,
  uploadAvatarHandler,
  changePassword,
  deactivateAccount,
  verifyEmail,
  resendVerificationEmail,
  sendPhoneOtp,
  verifyPhoneOtp,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiters');
const { uploadAvatar } = require('../middleware/upload');

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çox sayda giriş cəhdi edildi. 15 dəqiqə sonra yenidən cəhd edin.'
  }
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çox sayda OTP sorğusu edildi. 10 dəqiqə sonra yenidən cəhd edin.'
  }
});

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çox sayda sorğu edildi. 1 saat sonra yenidən cəhd edin.'
  }
});

// ─── Public routes ───────────────────────────────────────────────────────────
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);

// Email verification
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification-email', resetLimiter, resendVerificationEmail);

// Password reset
router.post('/forgot-password', resetLimiter, forgotPassword);
router.put('/reset-password/:token', authLimiter, resetPassword);

// ─── Protected routes ────────────────────────────────────────────────────────
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, uploadAvatar, uploadAvatarHandler);
router.put('/change-password', protect, changePassword);
router.delete('/deactivate', protect, deactivateAccount);
router.delete('/delete-account', protect, deactivateAccount);

// Phone OTP (requires login)
router.post('/send-phone-otp', protect, otpLimiter, sendPhoneOtp);
router.post('/verify-phone-otp', protect, verifyPhoneOtp);

module.exports = router;
