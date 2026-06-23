const { Client } = require("@googlemaps/google-maps-services-js");

const client = new Client({});

const getDistanceAndDuration = async (origin, destination) => {
  try {
    if (!origin || !destination) {
      throw new Error("Origin and destination are required");
    }

    const response = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000, // əlavə: request timeout
    });

    const element = response?.data?.rows?.[0]?.elements?.[0];

    // Əgər route tapılmasa
    if (!element || element.status !== "OK") {
      throw new Error("No route found between locations");
    }

    return {
      distanceKm: +(element.distance.value / 1000).toFixed(2),
      durationMinutes: Math.ceil(element.duration.value / 60),
    };
  } catch (error) {
    console.error("Google Maps error:", error.message);

    throw new Error("Failed to fetch distance and duration");
  }
};

// Geocode a free-text address (e.g. "<street>, <region>, Azerbaijan") → { lat, lng }.
const geocodeAddress = async (address) => {
  if (!address || !String(address).trim()) {
    throw new Error("Address is required");
  }

  try {
    const response = await client.geocode({
      params: {
        address: String(address).trim(),
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 5000,
    });

    if (response?.data?.status !== "OK" || !response.data.results?.length) {
      throw new Error("Address could not be geocoded");
    }

    const { lat, lng } = response.data.results[0].geometry.location;
    return { lat, lng };
  } catch (error) {
    console.error("Google Geocoding error:", error.message);
    throw new Error("Failed to geocode address");
  }
};

module.exports = { getDistanceAndDuration, geocodeAddress };