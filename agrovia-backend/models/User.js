const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // Ümumi məlumatlar
    firstName: {
      type: String,
      required: [true, 'Ad tələb olunur'],
      trim: true,
      minlength: [3, 'Ad minimum 3 simvol olmalıdır'],
      maxlength: [50, 'Ad maksimum 50 simvol ola bilər']
    },
    lastName: {
      type: String,
      required: [true, 'Soyad tələb olunur'],
      trim: true,
      minlength: [3, 'Soyad minimum 3 simvol olmalıdır'],
      maxlength: [50, 'Soyad maksimum 50 simvol ola bilər']
    },
    email: {
      type: String,
      required: [true, 'Email tələb olunur'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Telefon nömrəsi tələb olunur'],
      unique: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Şifrə tələb olunur'],
      minlength: [8, 'Şifrə minimum 8 simvol olmalıdır'],
      maxlength: [30, 'Şifrə maksimum 30 simvol olabilir'],
      select: false // Default olaraq şifrəni query-də göstərmə
    },
    
    // Rol sistemi
    role: {
      type: String,
      enum: ['admin', 'seller', 'buyer', 'courier'],
      required: true
    },
    
    // Profil şəkli
    avatar: {
      public_id: String,
      url: String
    },
    
    // Ünvan məlumatları (Alıcı və Kuryer üçün)
    address: {
      region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Region'
      },
      city: String,
      street: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    
    // Satici üçün əlavə məlumatlar
    sellerInfo: {
      businessName: String,
      businessDescription: String,
      taxNumber: String,
      saleType: {
        type: String,
        enum: ['retail', 'wholesale', 'both'],
        default: 'both'
      },
      isVerified: {
        type: Boolean,
        default: false
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalSales: {
        type: Number,
        default: 0
      }
    },
    
    // Kuryer üçün əlavə məlumatlar
    courierInfo: {
      vehicleType: {
        type: String,
        enum: ['car', 'motorcycle', 'truck', 'van', 'bicycle'],
        // car - avtomobil, motorcycle - motosiklet, truck - yük maşını, van - mikroavtobus, bicycle - velosiped
      },
      vehicleNumber: String,
      licenseNumber: String,
      workingDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      workingHours: {
        start: String, // "09:00"
        end: String    // "18:00"
      },
      maxDeliveryDistance: {
        type: Number,
        default: 500 // km
      },
      isAvailable: {
        type: Boolean,
        default: true
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      totalDeliveries: {
        type: Number,
        default: 0
      }
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    // Email doğrulama tokeni
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpire: { type: Date, select: false },

    // Telefon OTP
    isPhoneVerified: { type: Boolean, default: false },
    phoneOtpHash: { type: String, select: false },
    phoneOtpExpire: { type: Date, select: false },
    phoneOtpAttempts: { type: Number, default: 0, select: false },

    // Şifrə sıfırlama tokeni
    passwordResetToken: { type: String, select: false },
    passwordResetExpire: { type: Date, select: false }
  },
  {
    timestamps: true, // createdAt və updatedAt avtomatik əlavə edir
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual - Tam ad
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Şifrəni hash et (yadda saxlamazdan əvvəl)
userSchema.pre('save', async function() {
  // Şifrə dəyişməyibsə, hash etmə
  if (!this.isModified('password')) {
    return;
  }

  // Şifrəni hash et (10 round salt)
  this.password = await bcrypt.hash(this.password, 10);
});

// Şifrəni yoxlama metodu
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token yaratma metodu
userSchema.methods.getJWTToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Email doğrulama tokeni yarat (raw token emailə, hash DB-yə)
userSchema.methods.generateEmailVerificationToken = function() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 saat
  return rawToken;
};

// Şifrə sıfırlama tokeni yarat
userSchema.methods.generatePasswordResetToken = function() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.passwordResetExpire = Date.now() + 60 * 60 * 1000; // 1 saat
  return rawToken;
};

// Telefon OTP yarat (raw OTP SMS-ə, hash DB-yə)
userSchema.methods.generatePhoneOtp = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneOtpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const expireMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES, 10) || 10;
  this.phoneOtpExpire = Date.now() + expireMinutes * 60 * 1000;
  this.phoneOtpAttempts = 0;
  return otp;
};

// Telefon OTP yoxla
userSchema.methods.verifyPhoneOtp = function(otp) {
  if (!this.phoneOtpHash || !this.phoneOtpExpire) return false;
  if (Date.now() > this.phoneOtpExpire) return false;
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
  return this.phoneOtpHash === hashedOtp;
};

module.exports = mongoose.model('User', userSchema);