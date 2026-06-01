const express = require("express");
const { getDistanceAndDuration } = require("../utils/maps");
const { calculateDeliveryPrice } = require("../utils/deliveryPrice");
const Delivery = require("../models/Delivery");

const router = express.Router();

router.post("/calculate", async (req, res) => {
  try {
    const { origin, destination, weather, isPeak, demand, save } = req.body;

    // ✅ validation
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination are required",
      });
    }

    const { distanceKm, durationMinutes } =
      await getDistanceAndDuration(origin, destination);

    const price = calculateDeliveryPrice({
      distanceKm,
      durationMinutes,
      weather,
      isPeak,
      demand,
    });

    let delivery = null;

    // ✅ yalnız istəsən DB-yə yaz
    if (save) {
      delivery = await Delivery.create({
        distanceKm,
        durationMinutes,
        price,
      });
    }

    return res.status(200).json({
      success: true,
      distanceKm,
      durationMinutes,
      price,
      delivery,
    });

  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while calculating delivery",
    });
  }
});

module.exports = router;