const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['buyer_seller', 'buyer_courier', 'seller_courier', 'support'],
      required: true,
      index: true
    },

    // All users who may access this conversation (used for "my conversations" queries)
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }],

    // Role-specific refs (optional depending on type)
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    courier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // For support conversations — the user who opened it
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Optional context
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

    // Last-message snapshot for the list view
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },

    // Manual close (read-only for delivered courier chats is computed from order.status)
    isActive: { type: Boolean, default: true },

    // Unread count per participant: Map<userIdString, number>
    unread: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
