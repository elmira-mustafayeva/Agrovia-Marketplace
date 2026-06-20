const mongoose = require("mongoose");

// Order Item
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

// Order Schema
const orderSchema = new mongoose.Schema(
  {
    // Unique order number
    orderNumber: {
      type: String,
      unique: true,
      index: true
    },

    // Buyer
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Items
    items: {
      type: [orderItemSchema],
      validate: [(val) => val.length > 0, "Order must have at least 1 item"]
    },

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    // Distance-based delivery snapshot (computed at order creation, never recalculated).
    // deliveryFee above mirrors delivery.price for backward compatibility.
    delivery: {
      distanceKm: { type: Number, default: 0 },
      durationMinutes: { type: Number, default: 0 },
      price: { type: Number, default: 0 }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    // Delivery Address
    deliveryAddress: {
      region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region"
      },
      city: { type: String, trim: true },
      street: {
        type: String,
        trim: true,
        minlength: [3, 'Ünvan ən az 3 simvol olmalıdır'],
        maxlength: [200, 'Ünvan 200 simvoldan çox ola bilməz']
      },

      coordinates: {
        lat: Number,
        lng: Number
      },

      phone: { type: String, trim: true },
      recipientName: { type: String, trim: true }
    },

    // Payment
    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "online"],
        required: true
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
        index: true
      },
      paymentIntentId: { type: String },
      transactionId: String,
      paidAt: Date
    },

    // Stock idempotency marker — true once order items have decremented product stock.
    // Stock is deducted at payment success (card) / delivery (cash), never at order create.
    stockDeducted: {
      type: Boolean,
      default: false
    },

    // Financial ledger — snapshotted at order creation, never recalculated afterwards.
    // Internal accounting only (Stripe still pays the platform account; no Stripe Connect).
    payout: {
      productSubtotal: { type: Number, default: 0 },
      deliveryFee: { type: Number, default: 0 },
      platformCommissionRate: { type: Number, default: 0 },
      platformFee: { type: Number, default: 0 },
      sellerEarning: { type: Number, default: 0 },
      courierEarning: { type: Number, default: 0 },
      sellerPayoutStatus: {
        type: String,
        enum: ['pending', 'available', 'paid'],
        default: 'pending'
      },
      courierPayoutStatus: {
        type: String,
        enum: ['pending', 'available', 'paid'],
        default: 'pending'
      },
      sellerPaidAt: Date,
      courierPaidAt: Date
    },

    // Order-level courier (delivery) rating — separate from product Review.
    deliveryReview: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      createdAt: Date
    },

    // Order Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned"
      ],
      default: "pending",
      index: true
    },

    // Courier
    courier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,

    // Notes
    notes: {
      type: String,
      maxlength: 500
    },

    // Estimated delivery
    estimatedDeliveryDate: Date,

    // Tracking history
    trackingHistory: [
      {
        status: String,
        description: String,

        location: {
          lat: Number,
          lng: Number
        },

        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// # AUTO LOGIC

// Order number generator
orderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const prefix = "AGR";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    this.orderNumber = `${prefix}-${timestamp}-${random}`;
  }
});

// Auto price calculation
orderSchema.pre("save", async function () {
  this.subtotal = this.items.reduce(
    (acc, item) => acc + item.totalPrice,
    0
  );

  this.totalAmount = this.subtotal + this.deliveryFee;
});

// # INDEXES
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.paymentIntentId': 1 }, { sparse: true });

module.exports = mongoose.model("Order", orderSchema);