const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const User = require('../models/User');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deactivateAccount
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validators');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dəqiqə
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çox sayda giriş cəhdi edildi. 15 dəqiqə sonra yenidən cəhd edin.'
  }
});

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);

// NOTE: create-admin endpoint removed for security. Create admin using a one-off script or DB seed.

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/deactivate', protect, deactivateAccount);

module.exports = router;