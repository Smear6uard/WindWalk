import { API_URL } from '../constants/config';

export async function fetchRoute(origin, destination) {
  const params = new URLSearchParams({
    origin_lat: origin.lat,
    origin_lng: origin.lng,
    dest_lat: destination.lat,
    dest_lng: destination.lng,
  });
  const response = await fetch(`${API_URL}/api/route?${params}`);
  if (!response.ok) {
    throw new Error(`Route fetch failed: ${response.status}`);
  }
  return response.json();
}
