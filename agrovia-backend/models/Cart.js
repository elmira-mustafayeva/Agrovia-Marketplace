const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Miqdar minimum 1 olmalıdır'],
    default: 1
  },
  price: {
    type: Number,
    required: true
    // Səbətə əlavə edildiyi vaxtın qiyməti (sonradan dəyişə bilər)
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // Hər istifadəçinin bir səbəti olur
    },
    items: [cartItemSchema],
    
    // Ümumi məlumatlar
    totalAmount: {
      type: Number,
      default: 0
    },
    totalItems: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Səbəti yadda saxlamazdan əvvəl ümumi məbləği hesabla
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);