const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');

// Helper: safe user object for responses (never expose sensitive fields)
const userPayload = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
  avatar: user.avatar,
  isActive: user.isActive
});

// ─── REGISTER ────────────────────────────────────────────────────────────────
// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const {
    firstName, lastName, email, phone, password,
    role, address, region, sellerInfo, courierInfo
  } = req.body;

  if (role === 'admin') {
    throw new ApiError(403, 'Admin accounts cannot be created through public registration');
  }

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    throw new ApiError(400, 'Bu email və ya telefon nömrəsi artıq qeydiyyatdan keçib');
  }

  const normalizedAddress = { ...(address || {}) };
  const selectedRegion = region || address?.region;
  if (selectedRegion) normalizedAddress.region = selectedRegion;

  const requiresAdminApproval = role === 'seller' || role === 'courier';

  const userData = {
    firstName, lastName, email, phone, password, role,
    address: normalizedAddress,
    isActive: !requiresAdminApproval
  };
  if (role === 'seller' && sellerInfo) userData.sellerInfo = sellerInfo;
  if (role === 'courier' && courierInfo) userData.courierInfo = courierInfo;

  const user = await User.create(userData);

  // Generate email verification token and persist it
  const verificationToken = user.generateEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // Send verification email — non-blocking (do not fail registration on email error)
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Agrovia — Email Doğrulama',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#2d6a4f">Email Doğrulama</h2>
          <p>Salam <strong>${user.firstName}</strong>,</p>
          <p>Qeydiyyatınızı tamamlamaq üçün aşağıdakı düyməyə klik edin:</p>
          <a href="${verifyUrl}"
             style="display:inline-block;background:#2d6a4f;color:#fff;
                    padding:12px 28px;border-radius:4px;text-decoration:none;margin:16px 0">
            Email-i Doğrula
          </a>
          <p style="color:#666;font-size:13px">Link 24 saat ərzində etibarlıdır.</p>
          <p style="color:#666;font-size:13px">
            Əgər siz bu hesabı yaratmamısınızsa, bu emaili nəzərə almayın.
          </p>
        </div>
      `
    });
  } catch (emailErr) {
    // Log but don't fail — user can resend via /resend-verification-email
    console.error('Doğrulama emaili göndərilə bilmədi:', emailErr.message);
  }

  if (requiresAdminApproval) {
    return res.status(201).json({
      success: true,
      message: 'Qeydiyyat qəbul edildi. Emailinizi doğrulayın və admin təsdiqini gözləyin.',
      data: { pendingApproval: true, user: userPayload(user) }
    });
  }

  res.status(201).json({
    success: true,
    message: 'Qeydiyyat uğurlu! Emailinizi yoxlayın və hesabı doğrulayın.',
    data: { user: userPayload(user) }
  });
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────
// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Select password explicitly (select: false on schema)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Email və ya şifrə yanlışdır');
  }

  // Block inactive accounts (admin approval pending for seller/courier, or deactivated)
  if (!user.isActive) {
    const msg = (user.role === 'seller' || user.role === 'courier')
      ? 'Hesabınız admin təsdiqini gözləyir'
      : 'Hesabınız deaktiv edilib';
    throw new ApiError(401, msg);
  }

  // All non-admin roles must verify email before logging in
  if (user.role !== 'admin' && !user.isEmailVerified) {
    throw new ApiError(401, 'Email doğrulanmayıb. Zəhmət olmasa, emailinizi yoxlayın.');
  }

  const token = user.getJWTToken();

  res.status(200).json({
    success: true,
    message: 'Giriş uğurludur',
    token,
    user: userPayload(user)
  });
});

// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
// GET /api/auth/verify-email/:token
exports.verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // Explicitly select the token fields so we can read and clear them
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: mongoose.trusted({ $gt: new Date() })
  }).select('+emailVerificationToken +emailVerificationExpire');

  if (!user) {
    throw new ApiError(400, 'Doğrulama linki etibarsızdır və ya vaxtı keçib');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Email uğurla doğrulandı. İndi daxil ola bilərsiniz.'
  });
});

// ─── RESEND VERIFICATION EMAIL ────────────────────────────────────────────────
// POST /api/auth/resend-verification-email
exports.resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email tələb olunur');
  }

  // Always return 200 — never reveal whether the email is registered (enumeration prevention)
  const user = await User.findOne({ email })
    .select('+emailVerificationToken +emailVerificationExpire');

  if (user && !user.isEmailVerified) {
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Agrovia — Email Doğrulama (Yenidən)',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2d6a4f">Email Doğrulama</h2>
            <p>Salam <strong>${user.firstName}</strong>,</p>
            <p>Yeni doğrulama linkiniz:</p>
            <a href="${verifyUrl}"
               style="display:inline-block;background:#2d6a4f;color:#fff;
                      padding:12px 28px;border-radius:4px;text-decoration:none;margin:16px 0">
              Email-i Doğrula
            </a>
            <p style="color:#666;font-size:13px">Link 24 saat ərzində etibarlıdır.</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Yenidən doğrulama emaili göndərilə bilmədi:', emailErr.message);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Əgər bu email sistemdə qeydiyyatlıdırsa, doğrulama linki göndərilib.'
  });
});

// ─── SEND PHONE OTP ───────────────────────────────────────────────────────────
// POST /api/auth/send-phone-otp  (protected)
exports.sendPhoneOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user.isPhoneVerified) {
    throw new ApiError(400, 'Telefon nömrəsi artıq doğrulanıb');
  }

  const otp = user.generatePhoneOtp();
  await user.save({ validateBeforeSave: false });

  try {
    await sendSms({
      to: user.phone,
      message: `Agrovia OTP kodunuz: ${otp}. Bu kod ${process.env.OTP_EXPIRE_MINUTES || 10} dəqiqə etibarlıdır. Heç kimlə paylaşmayın.`
    });
  } catch (smsErr) {
    // Clear OTP so user can retry — don't leave an orphaned hash
    user.phoneOtpHash = undefined;
    user.phoneOtpExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(503, 'SMS göndərilə bilmədi: ' + smsErr.message);
  }

  const response = {
    success: true,
    message: `OTP kodu ${user.phone} nömrəsinə göndərildi`
  };

  // Expose OTP only in development — NEVER in production
  if (process.env.NODE_ENV !== 'production') {
    response.otp = otp;
  }

  res.status(200).json(response);
});

// ─── VERIFY PHONE OTP ─────────────────────────────────────────────────────────
// POST /api/auth/verify-phone-otp  (protected)
exports.verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;

  if (!otp) {
    throw new ApiError(400, 'OTP kodu tələb olunur');
  }

  const user = await User.findById(req.user.id)
    .select('+phoneOtpHash +phoneOtpExpire +phoneOtpAttempts');

  if (user.isPhoneVerified) {
    throw new ApiError(400, 'Telefon nömrəsi artıq doğrulanıb');
  }

  if (!user.phoneOtpHash || !user.phoneOtpExpire) {
    throw new ApiError(400, 'OTP göndərilməyib. Əvvəlcə /send-phone-otp sorğusu edin');
  }

  // Enforce maximum 5 attempts before requiring a new OTP
  if (user.phoneOtpAttempts >= 5) {
    throw new ApiError(429, 'Çox sayda yanlış cəhd. Yeni OTP tələb edin');
  }

  // Increment attempt counter before checking — prevents brute force via timing
  user.phoneOtpAttempts += 1;
  await user.save({ validateBeforeSave: false });

  if (!user.verifyPhoneOtp(otp)) {
    const remaining = 5 - user.phoneOtpAttempts;
    const msg = remaining > 0
      ? `OTP yanlışdır. ${remaining} cəhd hüququnuz qalıb`
      : 'OTP yanlışdır. Yeni OTP tələb edin';
    throw new ApiError(400, msg);
  }

  // Correct OTP — mark as verified and clear OTP fields
  user.isPhoneVerified = true;
  user.phoneOtpHash = undefined;
  user.phoneOtpExpire = undefined;
  user.phoneOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Telefon nömrəsi uğurla doğrulandı'
  });
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email tələb olunur');
  }

  const user = await User.findOne({ email });

  // Always return 200 — never reveal whether the email is registered
  if (user) {
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: 'Agrovia — Şifrə Sıfırlama',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#2d6a4f">Şifrə Sıfırlama</h2>
            <p>Salam <strong>${user.firstName}</strong>,</p>
            <p>Şifrənizi sıfırlamaq üçün aşağıdakı düyməyə klik edin:</p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#2d6a4f;color:#fff;
                      padding:12px 28px;border-radius:4px;text-decoration:none;margin:16px 0">
              Şifrəni Sıfırla
            </a>
            <p style="color:#666;font-size:13px">Link 1 saat ərzində etibarlıdır.</p>
            <p style="color:#666;font-size:13px">
              Bu sorğunu siz etməmisinizsə, bu emaili nəzərə almayın.
            </p>
          </div>
        `
      });
    } catch (emailErr) {
      // Clear token so user can request again
      user.passwordResetToken = undefined;
      user.passwordResetExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Şifrə sıfırlama emaili göndərilə bilmədi:', emailErr.message);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Əgər bu email sistemdə mövcuddursa, şifrə sıfırlama linki göndərilib.'
  });
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
// PUT /api/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: mongoose.trusted({ $gt: new Date() })
  }).select('+passwordResetToken +passwordResetExpire');

  if (!user) {
    throw new ApiError(400, 'Token etibarsızdır və ya vaxtı keçib');
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'Yeni şifrə minimum 8 simvol olmalıdır');
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  // Full save — triggers bcrypt pre('save') hook
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Şifrə uğurla sıfırlandı. İndi yeni şifrənizlə daxil ola bilərsiniz.'
  });
});

// ─── GET ME ───────────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('address.region', 'name');

  res.status(200).json({
    success: true,
    user
  });
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
// PUT /api/auth/profile  (protected)
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowedUpdates = ['firstName', 'lastName', 'phone', 'email', 'address', 'avatar'];
  const updates = {};
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profil yeniləndi',
    user: userPayload(user)
  });
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
// PUT /api/auth/change-password  (protected)
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Cari şifrə yanlışdır');
  }

  if (!newPassword || newPassword.length < 8) {
    throw new ApiError(400, 'Yeni şifrə minimum 8 simvol olmalıdır');
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Şifrə uğurla dəyişdirildi'
  });
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
// DELETE /api/auth/delete-account  (protected)
exports.deactivateAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Hesabınız deaktiv edildi'
  });
});
