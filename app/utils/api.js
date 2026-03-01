import { API_URL } from '../constants/config';

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWindStreets(windDirection) {
  const res = await fetchWithTimeout(
    `${API_URL}/api/wind-streets?wind_direction=${encodeURIComponent(windDirection)}`
  );
  if (!res.ok) throw new Error(`Wind streets fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchRoute(origin, destination) {
  const params = new URLSearchParams({
    origin_lat: origin.lat,
    origin_lng: origin.lng,
    dest_lat: destination.lat,
    dest_lng: destination.lng,
  });
  const response = await fetchWithTimeout(`${API_URL}/api/route?${params}`);
  if (!response.ok) {
    throw new Error(`Route fetch failed: ${response.status}`);
  }
  return response.json();
}
