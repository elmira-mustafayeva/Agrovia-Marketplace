import mongoose from "mongoose";

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

export default mongoose.model("Delivery", deliverySchema);