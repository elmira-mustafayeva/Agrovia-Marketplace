const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { register, login, getMe, updateProfile, changePassword, deactivateAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validators');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// NOTE: create-admin endpoint removed for security. Create admin using a one-off script or DB seed.

// Protected routes (token tələb edir)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/deactivate', protect, deactivateAccount);

module.exports = router;