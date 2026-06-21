/**
 * Delivery price calculator — three-tier model, no time/weather/demand multipliers.
 *
 * Tier A  same region       2.00 + km×0.35,  min 2.50,  max  8.00
 * Tier B  cross-region ≤100 km  4.00 + km×0.45,  min 5.00,  max 25.00
 * Tier C  cross-region >100 km  progressive 5-band starting at 25.00, max 50.00
 *
 *   C1 100–200 km: +0.10/km (max +10.00)
 *   C2 200–300 km: +0.06/km (max  +6.00)
 *   C3 300–400 km: +0.04/km (max  +4.00)
 *   C4 400–500 km: +0.03/km (max  +3.00)
 *   C5 500–600 km: +0.02/km (max  +2.00)  → 50.00 at 600 km, hard-capped
 */
const calculateDeliveryPrice = ({ distanceKm, sameRegion = false }) => {
  if (!distanceKm || distanceKm <= 0) {
    throw new Error('Məsafə məlumatı düzgün əldə edilə bilmədi.');
  }

  const d = distanceKm;
  let price;

  if (sameRegion) {
    price = 2.00 + d * 0.35;
    price = Math.max(price, 2.50);
    price = Math.min(price, 8.00);
  } else if (d <= 100) {
    price = 4.00 + d * 0.45;
    price = Math.max(price, 5.00);
    price = Math.min(price, 25.00);
  } else {
    price = 25.00;
    price += Math.min(d - 100, 100) * 0.10;
    if (d > 200) price += Math.min(d - 200, 100) * 0.06;
    if (d > 300) price += Math.min(d - 300, 100) * 0.04;
    if (d > 400) price += Math.min(d - 400, 100) * 0.03;
    if (d > 500) price += Math.min(d - 500, 100) * 0.02;
    price = Math.min(price, 50.00);
  }

  return Number(price.toFixed(2));
};

module.exports = { calculateDeliveryPrice };
