const User = require('../models/User');

// Qeydiyyat (Register)
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      address,
      region,
      sellerInfo,
      courierInfo
    } = req.body;

    // Email və telefon unikallığını yoxla
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email və ya telefon nömrəsi artıq qeydiyyatdan keçib'
      });
    }

    // Yeni istifadəçi yarat
    const normalizedAddress = {
      ...(address || {})
    };

    const selectedRegion = region || address?.region;
    if (selectedRegion) {
      normalizedAddress.region = selectedRegion;
    }

    const requiresAdminApproval = role === 'seller' || role === 'courier';

    const userData = {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      address: normalizedAddress,
      isActive: !requiresAdminApproval
    };

    // Satici məlumatları
    if (role === 'seller' && sellerInfo) {
      userData.sellerInfo = sellerInfo;
    }

    // Kuryer məlumatları
    if (role === 'courier' && courierInfo) {
      userData.courierInfo = courierInfo;
    }

    const user = await User.create(userData);

    if (requiresAdminApproval) {
      return res.status(201).json({
        success: true,
        pendingApproval: true,
        message: 'Qeydiyyat qəbul edildi. Admin təsdiqindən sonra giriş edə biləcəksiniz.',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive
        }
      });
    }

    // Token yarat
    const token = user.getJWTToken();

    res.status(201).json({
      success: true,
      message: 'Qeydiyyat uğurla tamamlandı',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qeydiyyat zamanı xəta baş verdi',
      error: error.message
    });
  }
};

// Giriş (Login)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Email və şifrə yoxla
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Zəhmət olmasa, email və şifrə daxil edin'
      });
    }

    // İstifadəçini tap (şifrəni də seç)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email və ya şifrə yanlışdır'
      });
    }

    // Şifrəni yoxla
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email və ya şifrə yanlışdır'
      });
    }

    // İstifadəçi aktiv deyilsə
    if (!user.isActive) {
      const pendingApprovalMessage = (user.role === 'seller' || user.role === 'courier')
        ? 'Hesabınız admin təsdiqini gözləyir'
        : 'Hesabınız deaktivdir';

      return res.status(401).json({
        success: false,
        message: pendingApprovalMessage
      });
    }

    // Token yarat
    const token = user.getJWTToken();

    res.status(200).json({
      success: true,
      message: 'Giriş uğurludur',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Giriş zamanı xəta baş verdi',
      error: error.message
    });
  }
};

// Profil məlumatları
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('address.region', 'name')
      .populate('sellerInfo.region', 'name');

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil məlumatları alınarkən xəta',
      error: error.message
    });
  }
};

// Profil yenilə
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'email', 'address', 'avatar'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profil yeniləndi',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil yenilənərkən xəta',
      error: error.message
    });
  }
};

// Şifrəni dəyiş
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Cari şifrəni yoxla
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Cari şifrə yanlışdır'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Şifrə uğurla dəyişdirildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifrə dəyişdirilərkən xəta',
      error: error.message
    });
  }
};

// Hesabı deaktiv et
exports.deactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Hesabınız deaktiv edildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Hesab deaktiv edilərkən xəta',
      error: error.message
    });
  }
};
