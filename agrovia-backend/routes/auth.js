const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, deactivateAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validators');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/deactivate', protect, deactivateAccount);

module.exports = router;