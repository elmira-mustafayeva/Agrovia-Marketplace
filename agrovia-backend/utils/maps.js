import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export const getDistanceAndDuration = async (origin, destination) => {
  try {
    const response = await client.distancematrix({
      params: {
        origins: [origin], // "Baku"
        destinations: [destination], // "Sumgait"
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    const element = response.data.rows[0].elements[0];

    return {
      distanceKm: element.distance.value / 1000,
      durationMinutes: element.duration.value / 60
    };
  } catch (error) {
    throw new Error("Failed to fetch distance");
  }
};