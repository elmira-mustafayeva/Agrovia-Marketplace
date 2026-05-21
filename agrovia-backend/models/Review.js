const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    // Kim rəy yazıb
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Hansı məhsul haqqında
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    
    // Hansı sifarişdən (təsdiqləmək üçün)
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    
    // Məhsul reytinqi
    productRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    
    // Məhsul rəyi
    productReview: {
      type: String,
      required: true,
      maxlength: [1000, 'Rəy maksimum 1000 simvol ola bilər']
    },
    
    // Kuryer reytinqi (əgər kuryer varsa)
    courierRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    
    // Kuryer rəyi
    courierReview: {
      type: String,
      maxlength: [500, 'Rəy maksimum 500 simvol ola bilər'],
      default: null
    },
    
    // Kuryer (kim çatdırıb)
    courier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    
    // Faydalı sayı (digər istifadəçilər tərəfindən)
    helpful: {
      type: Number,
      default: 0
    },
    
    // Status
    isVerified: {
      type: Boolean,
      default: false // Admin təsdiqi
    }
  },
  {
    timestamps: true
  }
);

// Bir istifadəçi bir məhsula bir dəfə rəy yaza bilər
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);