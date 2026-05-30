const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { register, login, getMe, updateProfile, changePassword, deactivateAccount } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validators');

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Bir dəfəlik admin yaratmaq (ilk qurulum üçün)
// İSTİFADƏ QAYDASI:
// 1. POST /api/auth/create-admin ilə admin yarat
// 2. Sonra bu endpoint-i comment et və ya sil (təhlükəsizlik üçün)
router.post('/create-admin', async (req, res) => {
  try {
    const { secretKey, firstName, lastName, email, phone, password } = req.body;

    // Gizli açar yoxla (.env-də ADMIN_SECRET_KEY olmalıdır)
    if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'İcazə yoxdur. Yanlış gizli açar.'
      });
    }

    // Əvvəlcədən admin varmı yoxla
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin artıq mövcuddur. Yalnız bir admin ola bilər.'
      });
    }

    // Yeni admin yarat
    const admin = await User.create({
      firstName: firstName || 'Super',
      lastName: lastName || 'Admin',
      email: email || 'admin@agrovia.az',
      phone: phone || '+994997133777',
      password: password || 'admin123',
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Admin uğurla yaradıldı!',
      admin: {
        id: admin._id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role
      },
      warning: 'BU ENDPOINT-I INDI COMMENT ET VE YA SIL (TƏHLÜKƏSIZLIK ÜÇÜN)'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Admin yaradılarkən xəta baş verdi',
      error: error.message
    });
  }
});

// Protected routes (token tələb edir)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/deactivate', protect, deactivateAccount);

module.exports = router;