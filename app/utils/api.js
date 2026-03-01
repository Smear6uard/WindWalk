import { API_URL } from '../constants/config';

const FETCH_TIMEOUT_MS = 15000;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371000 * c;
}

function classifyExposure(feelsLikeF) {
  if (feelsLikeF <= 10) return 'high';
  if (feelsLikeF <= 22) return 'moderate';
  return 'low';
}

function buildOfflineWeather(seed = Date.now()) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.abs(Math.floor(seed / 1000)) % directions.length;
  const tempF = 26 + ((seed % 7) - 3);
  const windMph = 14 + (seed % 9);
  const feelsLikeF = tempF - Math.round(windMph / 3);
  return {
    temp_f: tempF,
    wind_speed_mph: windMph,
    wind_direction: directions[idx],
    wind_direction_deg: idx * 22.5,
    feels_like_f: feelsLikeF,
    computed_wind_chill_f: feelsLikeF,
    source: 'offline',
  };
}

function buildOfflineRoutes(origin, destination, weather = buildOfflineWeather()) {
  const originPoint = [origin.lng, origin.lat];
  const destinationPoint = [destination.lng, destination.lat];

  const shortestDistance = haversineMeters(origin.lat, origin.lng, destination.lat, destination.lng);
  const shortestDuration = Math.max(1, Math.round((shortestDistance / 80) * 10) / 10);
  const shortestFeels = weather.feels_like_f ?? weather.temp_f ?? 28;

  const dx = destination.lng - origin.lng;
  const dy = destination.lat - origin.lat;
  const norm = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = 0.0012;
  const perpLng = (-dy / norm) * offset;
  const perpLat = (dx / norm) * offset;

  const mid1 = {
    lat: origin.lat + dy * 0.35 + perpLat,
    lng: origin.lng + dx * 0.35 + perpLng,
  };
  const mid2 = {
    lat: origin.lat + dy * 0.65 + perpLat,
    lng: origin.lng + dx * 0.65 + perpLng,
  };

  const comfortDistance =
    haversineMeters(origin.lat, origin.lng, mid1.lat, mid1.lng) +
    haversineMeters(mid1.lat, mid1.lng, mid2.lat, mid2.lng) +
    haversineMeters(mid2.lat, mid2.lng, destination.lat, destination.lng);
  const comfortDuration = Math.max(1, Math.round((comfortDistance / 80) * 10) / 10);
  const comfortFeels = shortestFeels + 5;

  return {
    origin: { ...origin },
    destination: { ...destination },
    weather,
    fallback: true,
    routes: [
      {
        id: 'shortest',
        label: 'Shortest',
        geometry: {
          type: 'LineString',
          coordinates: [originPoint, destinationPoint],
        },
        distance_m: Math.round(shortestDistance),
        duration_min: shortestDuration,
        feels_like_avg_f: shortestFeels,
        wind_exposure: classifyExposure(shortestFeels),
        pedway_segments: 0,
        segments: [
          {
            type: 'outdoor',
            distance_m: Math.round(shortestDistance),
            wind_amplification: 1.2,
            feels_like_f: shortestFeels,
            is_pedway: false,
          },
        ],
      },
      {
        id: 'comfort',
        label: 'WindWalk',
        geometry: {
          type: 'LineString',
          coordinates: [originPoint, [mid1.lng, mid1.lat], [mid2.lng, mid2.lat], destinationPoint],
        },
        distance_m: Math.round(comfortDistance),
        duration_min: comfortDuration,
        feels_like_avg_f: comfortFeels,
        wind_exposure: classifyExposure(comfortFeels),
        pedway_segments: 1,
        segments: [
          {
            type: 'outdoor',
            distance_m: Math.round(haversineMeters(origin.lat, origin.lng, mid1.lat, mid1.lng)),
            wind_amplification: 1.1,
            feels_like_f: shortestFeels + 1,
            is_pedway: false,
          },
          {
            type: 'pedway',
            distance_m: Math.round(haversineMeters(mid1.lat, mid1.lng, mid2.lat, mid2.lng)),
            wind_amplification: 0,
            feels_like_f: comfortFeels + 2,
            is_pedway: true,
          },
          {
            type: 'outdoor',
            distance_m: Math.round(haversineMeters(mid2.lat, mid2.lng, destination.lat, destination.lng)),
            wind_amplification: 1.05,
            feels_like_f: comfortFeels - 1,
            is_pedway: false,
          },
        ],
      },
    ],
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
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

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/route?${params}`);
    if (!response.ok) {
      throw new Error(`Route fetch failed: ${response.status}`);
    }
    return await response.json();
  } catch {
    return buildOfflineRoutes(origin, destination);
  }
}

export { buildOfflineWeather };
