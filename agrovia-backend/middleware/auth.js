const jwt = require('jsonwebtoken');
const User = require('../models/User');

// İstifadəçini yoxla (login olub-olmadığını)
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Tokeni header-dən al
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Token yoxdursa
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Giriş tələb olunur. Zəhmət olmasa, daxil olun.'
      });
    }

    try {
      // Tokeni yoxla
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // İstifadəçini tap
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'İstifadəçi tapılmadı'
        });
      }

      // İstifadəçi aktiv deyilsə
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Hesabınız deaktiv edilib'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token etibarsızdır'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xətası',
      error: error.message
    });
  }
};

// Rol yoxlama
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bu əməliyyat üçün ${roles.join(', ')} rolu tələb olunur`
      });
    }
    next();
  };
};