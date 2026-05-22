export const calculateDeliveryPrice = ({
  distanceKm,
  durationMinutes,
  weather = "normal",
  isPeak = false,
  demand = "normal"
}) => {

  const baseFee = 1.2;
  const perKmRate = 0.5;
  const perMinuteRate = 0.02;

  const weatherMap = {
    normal: 1,
    rain: 1.2,
    snow: 1.5
  };

  const demandMap = {
    normal: 1,
    busy: 1.2,
    very_busy: 1.5
  };

  const distanceFee = distanceKm * perKmRate;
  const timeFee = durationMinutes * perMinuteRate;

  let price =
    (baseFee + distanceFee + timeFee) *
    weatherMap[weather] *
    (isPeak ? 1.3 : 1) *
    demandMap[demand];

  if (distanceKm > 10) price += 2;
  if (price < 2) price = 2;

  return Number(price.toFixed(2));
};