const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Kateqoriya adı tələb olunur'],
      unique: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    icon: {
      type: String // Icon URL və ya class adı
    },
    image: {
      public_id: String,
      url: String
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
      // Alt kateqoriyalar üçün
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0 // Sıralama üçün
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Category', categorySchema);