const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    }
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
userSchema.pre('save', async function(next) {
  // Şifrə dəyişməyibsə, hash etmə
  if (!this.isModified('password')) {
    next();
    return;
  }
  
  // Şifrəni hash et (10 round salt)
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Şifrəni yoxlama metodu
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token yaratma metodu
userSchema.methods.getJWTToken = function() {
  return require('jsonwebtoken').sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

module.exports = mongoose.model('User', userSchema);