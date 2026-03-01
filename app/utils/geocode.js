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
  {
    id: 'block37',
    label: 'Block 37, Chicago',
    coordinates: { lat: 41.8837, lng: -87.6278 },
  },
  // DePaul Loop Campus buildings (approximate coordinates)
  {
    id: 'depaul_center',
    label: 'DePaul Center (1 E Jackson Blvd)',
    coordinates: { lat: 41.8789, lng: -87.6267 },
  },
  {
    id: 'lewis_center',
    label: 'Lewis Center (25 E Jackson Blvd)',
    coordinates: { lat: 41.8789, lng: -87.6260 },
  },
  {
    id: 'daley_building',
    label: 'Daley Building (14 E Jackson Blvd)',
    coordinates: { lat: 41.8787, lng: -87.6264 },
  },
  {
    id: 'cna_building',
    label: 'DePaul CDM at CNA Building (Chicago)',
    coordinates: { lat: 41.8784, lng: -87.6260 },
  },
];

export async function geocodeAddress(query) {
  const q = (query || '').trim().toLowerCase();

  // Empty query returns all places (for showing suggestions on focus).
  if (!q) {
    return [...PLACES];
  }

  // Substring search over the fixed list.
  const matches = PLACES.filter((p) => p.label.toLowerCase().includes(q));
  return matches;
}

