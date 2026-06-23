const Region = require('../models/Region');
const User = require('../models/User');
const { calculateDeliveryPrice } = require('./deliveryPrice');
const { getDistanceAndDuration, geocodeAddress } = require('./maps');

// Intra-region floor — prevents distance of 0 from reaching calculateDeliveryPrice.
const INTRA_REGION_KM = Number(process.env.INTRA_REGION_KM || 4);

// Last-resort region-name distances (km) — used ONLY when no coordinates are resolvable.
const KNOWN_DISTANCES = {
  'Bakı-Sumqayıt': 30,
  'Bakı-Gəncə': 360,
  'Bakı-Mingəçevir': 320,
  'Sumqayıt-Gəncə': 330
};

// Coordinates are valid only if finite, not both 0, and within Earth ranges.
const isValidCoords = (c) => {
  if (!c) return false;
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

const asCoords = (c) => ({ lat: Number(c.lat), lng: Number(c.lng) });

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const estimateDuration = (km) => Math.ceil(km * 1.5);

// Distance/duration between two coordinate points: Google Distance Matrix → Haversine → floor.
// Returns note indicating which method succeeded.
async function routeBetween(originCoords, destCoords) {
  try {
    const r = await getDistanceAndDuration(
      `${originCoords.lat},${originCoords.lng}`,
      `${destCoords.lat},${destCoords.lng}`
    );
    if (r && r.distanceKm > 0) return { ...r, note: 'google_api' };
  } catch (_) {
    // fall through to Haversine
  }

  const km = Math.round(haversineKm(originCoords, destCoords) * 100) / 100;
  if (km > 0) return { distanceKm: km, durationMinutes: estimateDuration(km), note: 'haversine' };

  return { distanceKm: INTRA_REGION_KM, durationMinutes: estimateDuration(INTRA_REGION_KM), note: 'intra_region_default' };
}

// Resolve the EXACT destination point: provided valid location → geocode "<street>, <region>".
async function resolveDestinationCoords({ destLocation, destStreet, destRegion }) {
  if (isValidCoords(destLocation)) return asCoords(destLocation);
  const address = [destStreet, destRegion?.name, 'Azerbaijan'].filter(Boolean).join(', ');
  try {
    const c = await geocodeAddress(address);
    if (isValidCoords(c)) return c;
  } catch (_) {
    // fall through to explicit failure
  }
  throw new Error('DEST_GEOCODE_FAILED');
}

// Resolve origin coordinates for one origin-region group, by priority:
// product.location → seller pickupLocation/address.coordinates → region.coordinates → geocode region name.
async function resolveOriginCoords(items, originRegion) {
  // 1. Product-level exact location override (first valid among the group's items)
  for (const it of items) {
    if (isValidCoords(it.productLocation)) return asCoords(it.productLocation);
  }

  // 2. Seller pickup location, else seller saved address coordinates
  const sellerId = items.map((it) => it.sellerId).find(Boolean);
  if (sellerId) {
    const seller = await User.findById(sellerId).select('sellerInfo.pickupLocation address.coordinates');
    if (isValidCoords(seller?.sellerInfo?.pickupLocation)) return asCoords(seller.sellerInfo.pickupLocation);
    if (isValidCoords(seller?.address?.coordinates)) return asCoords(seller.address.coordinates);
  }

  // 3. Region center coordinates
  if (isValidCoords(originRegion.coordinates)) return asCoords(originRegion.coordinates);

  // 4. Geocode the region name
  try {
    const c = await geocodeAddress(`${originRegion.name}, Azerbaijan`);
    if (isValidCoords(c)) return c;
  } catch (_) {
    // unresolved → caller falls back to the known-distance table
  }

  return null;
}

/**
 * Calculate a single delivery fee for an order from one or more origin regions to the buyer's
 * destination. Uses the FARTHEST origin distance — never sums per-region fees.
 *
 * @param {Array<{productLocation?:{lat,lng}, sellerId?:any, regionId:any}>} originItems
 * @param {{destRegionId:any, destStreet?:string, destLocation?:{lat,lng}}} dest
 * @returns {Promise<{distanceKm, durationMinutes, price, sameRegion, pricingTier, originCount, note, destLocation}>}
 * @throws 'DEST_GEOCODE_FAILED' | 'DEST_REGION_NOT_FOUND' | 'NO_ORIGIN_REGION' | 'ORIGIN_REGION_NOT_FOUND' | 'ORIGIN_DISTANCE_UNRESOLVED'
 */
async function computeOrderDelivery(originItems, { destRegionId, destStreet, destLocation } = {}) {
  const destRegion = await Region.findById(destRegionId);
  if (!destRegion) throw new Error('DEST_REGION_NOT_FOUND');

  const destCoords = await resolveDestinationCoords({ destLocation, destStreet, destRegion });

  // Group items by distinct origin region
  const groups = new Map();
  for (const it of originItems || []) {
    const rid = it.regionId && it.regionId.toString();
    if (!rid) continue;
    if (!groups.has(rid)) groups.set(rid, []);
    groups.get(rid).push(it);
  }
  if (groups.size === 0) throw new Error('NO_ORIGIN_REGION');

  // Collect distance data for each origin — do NOT price inside this loop.
  const originResults = [];

  for (const [regionId, items] of groups) {
    const originRegion = await Region.findById(regionId);
    if (!originRegion) throw new Error('ORIGIN_REGION_NOT_FOUND');

    let distanceKm;
    let durationMinutes;
    let note;

    const originCoords = await resolveOriginCoords(items, originRegion);
    if (originCoords) {
      const result = await routeBetween(originCoords, destCoords);
      distanceKm = result.distanceKm;
      durationMinutes = result.durationMinutes;
      note = result.note;
    } else {
      const km = KNOWN_DISTANCES[`${originRegion.name}-${destRegion.name}`] ||
        KNOWN_DISTANCES[`${destRegion.name}-${originRegion.name}`];
      if (!km) throw new Error('ORIGIN_DISTANCE_UNRESOLVED');
      distanceKm = km;
      durationMinutes = estimateDuration(km);
      note = 'known_table';
    }

    originResults.push({ regionId, distanceKm, durationMinutes, note });
  }

  // Use the farthest origin — one price for the whole order.
  const farthest = originResults.reduce((max, o) => (o.distanceKm > max.distanceKm ? o : max));

  const sameRegion = farthest.regionId === destRegion._id.toString();
  const price = calculateDeliveryPrice({ distanceKm: farthest.distanceKm, sameRegion });

  const pricingTier = sameRegion
    ? 'same_region'
    : farthest.distanceKm <= 100
      ? 'cross_region'
      : 'long_distance';

  return {
    distanceKm: farthest.distanceKm,
    durationMinutes: farthest.durationMinutes,
    price: Math.round(price * 100) / 100,
    sameRegion,
    pricingTier,
    originCount: groups.size,
    note: farthest.note,
    destLocation: destCoords,
  };
}

module.exports = { computeOrderDelivery, isValidCoords };
