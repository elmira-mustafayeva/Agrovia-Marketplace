const calculateDeliveryPrice = ({
  distanceKm = 0,
  durationMinutes = 0,
  weather = "normal",
  isPeak = false,
  demand = "normal",
}) => {
  if (distanceKm <= 0 || durationMinutes <= 0) {
    throw new Error("Invalid distance or duration");
  }

  const CONFIG = {
    baseFee: 1.2,
    perKmRate: 0.5,
    perMinuteRate: 0.02,
    peakMultiplier: 1.3,
    longDistanceThreshold: 10,
    longDistanceFee: 2,
    minPrice: 2,
  };

  const weatherMap = {
    normal: 1,
    rain: 1.2,
    snow: 1.5,
  };

  const demandMap = {
    normal: 1,
    busy: 1.2,
    very_busy: 1.5,
  };

  const weatherMultiplier = weatherMap[weather] || 1;
  const demandMultiplier = demandMap[demand] || 1;
  const peakMultiplier = isPeak ? CONFIG.peakMultiplier : 1;

  const distanceFee = distanceKm * CONFIG.perKmRate;
  const timeFee = durationMinutes * CONFIG.perMinuteRate;

  let price =
    (CONFIG.baseFee + distanceFee + timeFee) *
    weatherMultiplier *
    demandMultiplier *
    peakMultiplier;

  // long distance surcharge
  if (distanceKm > CONFIG.longDistanceThreshold) {
    price += CONFIG.longDistanceFee;
  }

  // minimum price
  price = Math.max(price, CONFIG.minPrice);

  return Number(price.toFixed(2));
};

module.exports = { calculateDeliveryPrice };