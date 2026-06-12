const { calculateDeliveryPrice } = require('../utils/deliveryPrice');

// Deterministic fallback distances (km) for known routes when Google Maps is unavailable
const KNOWN_DISTANCES = {
  'Bakı-Sumqayıt': 30,
  'Bakı-Gəncə': 360,
  'Bakı-Mingəçevir': 320,
  'Sumqayıt-Gəncə': 330,
};

const fallbackGetDistance = (origin, destination) => {
  const key = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  const distanceKm = KNOWN_DISTANCES[key] || KNOWN_DISTANCES[reverseKey];

  if (!distanceKm) {
    throw new Error(`Məsafə məlumatı əldə edilə bilmədi: ${origin} → ${destination}. Google Maps API açarını yoxlayın.`);
  }

  return { distanceKm, durationMinutes: Math.floor(distanceKm * 1.5) };
};

// @desc    Calculate delivery price
// @route   POST /api/delivery/calculate
// @access  Public
exports.calculateDelivery = async (req, res) => {
  try {
    const { origin, destination, weather = 'normal', isPeak = false, demand = 'normal' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Başlanğıc və təyinat ünvanları tələb olunur'
      });
    }

    // Try Google Maps first, fallback to mock
    let distanceKm, durationMinutes;
    
    try {
      const { getDistanceAndDuration } = require('../utils/maps');
      const result = await getDistanceAndDuration(origin, destination);
      distanceKm = result.distanceKm;
      durationMinutes = result.durationMinutes;
    } catch (error) {
      const fallback = fallbackGetDistance(origin, destination);
      distanceKm = fallback.distanceKm;
      durationMinutes = fallback.durationMinutes;
    }

    const price = calculateDeliveryPrice({
      distanceKm,
      durationMinutes,
      weather,
      isPeak,
      demand
    });

    res.status(200).json({
      success: true,
      distanceKm,
      durationMinutes,
      price,
      currency: 'AZN'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çatdırılma qiyməti hesablanarkən xəta',
      error: error.message
    });
  }
};