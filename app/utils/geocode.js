import { MAPBOX_TOKEN } from '../constants/config';

const CHICAGO_LOOP_PROXIMITY = '-87.6278,41.8819';
const CHICAGO_LOOP_BBOX = '-87.6500,41.8700,-87.6100,41.8950';

/**
 * Geocode a query using Mapbox Geocoding v5 API.
 * Biases results to Chicago Loop area.
 * @param {string} query - The search text (address, place name, etc.)
 * @param {function} setter - Callback receiving { lat, lng, label } for the first result
 * @returns {Promise<void>}
 */
export async function geocode(query, setter) {
  if (!query?.trim()) return;

  const encoded = encodeURIComponent(query.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?proximity=${CHICAGO_LOOP_PROXIMITY}&bbox=${CHICAGO_LOOP_BBOX}&access_token=${MAPBOX_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Geocode request failed:', res.status);
      return;
    }
    const data = await res.json();
    const features = data?.features;
    if (!features || features.length === 0) {
      console.error('Geocode: no results for', query);
      return;
    }
    const feature = features[0];
    const [lng, lat] = feature.geometry?.coordinates ?? feature.center ?? [];
    const place_name = feature.place_name ?? feature.text ?? query;
    if (lat != null && lng != null) {
      setter({ lat, lng, label: place_name });
    } else {
      console.error('Geocode: invalid coordinates in result');
    }
  } catch (err) {
    console.error('Geocode error:', err);
  }
}
