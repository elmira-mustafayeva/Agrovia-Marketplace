const { calculateDeliveryPrice } = require('../utils/deliveryPrice');

// Mock Google Maps (əgər API key yoxdursa)
const mockGetDistance = (origin, destination) => {
  // Sadə mock məsafə
  const distances = {
    'Bakı-Sumqayıt': 30,
    'Bakı-Gəncə': 360,
    'Bakı-Mingəçevir': 320,
    'Sumqayıt-Gəncə': 330,
  };
  
  const key = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  
  const distanceKm = distances[key] || distances[reverseKey] || Math.floor(Math.random() * 50) + 5;
  const durationMinutes = Math.floor(distanceKm * 1.5);

  return { distanceKm, durationMinutes };
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
      // Fallback to mock
      const mock = mockGetDistance(origin, destination);
      distanceKm = mock.distanceKm;
      durationMinutes = mock.durationMinutes;
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