// Simple in-memory "geocoding" without any external map service.
// This lets the search bar work using a fixed list of known places.

const PLACES = [
  {
    id: 'origin1',
    label: 'Willis Tower, Chicago',
    coordinates: { lat: 41.8789, lng: -87.6359 },
  },
  {
    id: 'origin2',
    label: 'Chicago Union Station',
    coordinates: { lat: 41.8786, lng: -87.6406 },
  },
  {
    id: 'dest1',
    label: 'Millennium Park, Chicago',
    coordinates: { lat: 41.8826, lng: -87.6226 },
  },
  {
    id: 'dest2',
    label: 'Merchandise Mart, Chicago',
    coordinates: { lat: 41.8884, lng: -87.6354 },
  },
  {
    id: 'pedway1',
    label: 'Chicago Pedway – Randolph & Wabash',
    coordinates: { lat: 41.8841, lng: -87.6264 },
  },
];

export async function geocodeAddress(query) {
  if (!query || !query.trim()) {
    return [];
  }

  const q = query.trim().toLowerCase();

  // Very simple substring search over the fixed list.
  const matches = PLACES.filter((p) => p.label.toLowerCase().includes(q));

  // Simulate async API shape used by the rest of the app.
  return matches;
}

