import { MAPBOX_TOKEN } from '../constants/config';

// Chicago Loop bounding box (minLng, minLat, maxLng, maxLat) for Mapbox
// Slightly expanded to include Union Station, Merchandise Mart, and nearby areas
const LOOP_BBOX = '-87.642,41.873,-87.622,41.89';

// Suggested places shown when the dropdown opens (empty query)
const SUGGESTED_PLACES = [
  { id: 'origin1', label: 'Willis Tower, Chicago', coordinates: { lat: 41.8789, lng: -87.6359 } },
  { id: 'origin2', label: 'Chicago Union Station', coordinates: { lat: 41.8786, lng: -87.6406 } },
  { id: 'dest1', label: 'Millennium Park, Chicago', coordinates: { lat: 41.8826, lng: -87.6226 } },
  { id: 'dest2', label: 'Merchandise Mart, Chicago', coordinates: { lat: 41.8884, lng: -87.6354 } },
  { id: 'pedway1', label: 'Chicago Pedway – Randolph & Wabash', coordinates: { lat: 41.8841, lng: -87.6264 } },
  { id: 'block37', label: 'Block 37, Chicago', coordinates: { lat: 41.8837, lng: -87.6278 } },
];

/**
 * Geocode an address or place name in the Chicago Loop.
 * - Empty query: returns suggested places for the dropdown.
 * - With Mapbox token: calls Mapbox Geocoding API (Loop bbox).
 * - Without token or on error: falls back to substring match on suggested places.
 */
export async function geocodeAddress(query) {
  const q = (query || '').trim();

  // Empty query returns suggested places for initial dropdown
  if (!q) {
    return [...SUGGESTED_PLACES];
  }

  if (MAPBOX_TOKEN) {
    try {
      const encoded = encodeURIComponent(q);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&bbox=${LOOP_BBOX}&limit=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Mapbox ${res.status}`);
      const data = await res.json();
      const features = data.features || [];
      return features.map((f, i) => ({
        id: f.id || `mapbox-${i}`,
        label: f.place_name || f.text || 'Unknown',
        coordinates: {
          lat: f.center[1],
          lng: f.center[0],
        },
      }));
    } catch (err) {
      console.warn('Mapbox geocode failed, using fallback:', err?.message);
    }
  }

  // Fallback: substring match on suggested places
  const lower = q.toLowerCase();
  return SUGGESTED_PLACES.filter((p) => p.label.toLowerCase().includes(lower));
}
