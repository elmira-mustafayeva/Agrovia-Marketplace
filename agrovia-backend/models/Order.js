const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    // Sifariş nömrəsi (unikal)
    orderNumber: {
      type: String,
      unique: true
    },
    
    // Alıcı
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Məhsullar
    items: [orderItemSchema],
    
    // Ümumi məlumatlar
    subtotal: {
      type: Number,
      required: true
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    
    // Çatdırılma ünvanı
    deliveryAddress: {
      region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Region'
      },
      city: String,
      street: String,
      phone: String,
      recipientName: String
    },
    
    // Ödəniş məlumatları
    payment: {
      method: {
        type: String,
        enum: ['cash', 'card', 'online'],
        required: true
        // cash - nağd, card - kart, online - onlayn ödəniş
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      transactionId: String,
      paidAt: Date
    },
    
    // Sifariş statusu
    status: {
      type: String,
      enum: [
        'pending',      // Gözləmədə
        'confirmed',    // Təsdiqləndi
        'preparing',    // Hazırlanır
        'ready',        // Hazır (kuryer gözləyir)
        'shipped',      // Yoldadır
        'delivered',    // Çatdırıldı
        'cancelled',    // Ləğv edildi
        'returned'      // Qaytarıldı
      ],
      default: 'pending'
    },
    
    // Kuryer məlumatları
    courier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    
    // Qeydlər
    notes: {
      type: String,
      maxlength: [500, 'Qeyd maksimum 500 simvol ola bilər']
    },
    
    // Sifariş tarixi
    estimatedDeliveryDate: Date,
    
    // İzləmə
    trackingHistory: [{
      status: String,
      description: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true
  }
);

// Sifariş nömrəsi yarat (yadda saxlamazdan əvvəl)
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const prefix = 'AGR';
    const timestamp = date.getTime().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);