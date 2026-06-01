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

module.exports = { getDistanceAndDuration };