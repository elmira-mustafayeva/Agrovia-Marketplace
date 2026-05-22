import express from "express";
import { getDistanceAndDuration } from "../utils/maps.js";
import { calculateDeliveryPrice } from "../utils/deliveryPrice.js";
import Delivery from "../models/Delivery.js";

const router = express.Router();

// 📦 Calculate delivery + save
router.post("/calculate", async (req, res) => {
  try {
    const {
      origin,
      destination,
      weather,
      isPeak,
      demand
    } = req.body;

    // 📍 Google Maps
    const { distanceKm, durationMinutes } =
      await getDistanceAndDuration(origin, destination);

    // 💰 Price
    const price = calculateDeliveryPrice({
      distanceKm,
      durationMinutes,
      weather,
      isPeak,
      demand
    });

    // 💾 Save delivery
    const delivery = await Delivery.create({
      distanceKm,
      durationMinutes,
      price
    });

    res.json({
      distanceKm,
      durationMinutes,
      price,
      delivery
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;