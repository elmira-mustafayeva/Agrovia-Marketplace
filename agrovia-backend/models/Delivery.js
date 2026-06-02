const mongoose = require ("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },

    courier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    distanceKm: Number,
    durationMinutes: Number,
    price: Number,

    status: {
      type: String,
      enum: ["waiting", "assigned", "picked", "delivered"],
      default: "waiting"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);