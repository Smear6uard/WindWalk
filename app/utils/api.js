import { API_URL } from '../constants/config';

export async function fetchRoute(origin, destination) {
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    throw new Error('Origin and destination must have lat and lng');
  }

  const params = new URLSearchParams({
    origin_lat: origin.lat.toString(),
    origin_lng: origin.lng.toString(),
    dest_lat: destination.lat.toString(),
    dest_lng: destination.lng.toString(),
  });

  const response = await fetch(`${API_URL}/api/route?${params}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}
