// Simple in-memory "geocoding" without any external map service.
// This lets the search bar work using a fixed list of known places.
import { MAPBOX_TOKEN } from '../constants/config';

const LOOP_BBOX = '-87.642,41.873,-87.622,41.89';

// Suggested places shown when the dropdown opens (empty query)
// Includes landmarks plus CTA L and Metra stations within the Loop bounding box
const SUGGESTED_PLACES = [
  // Landmarks
  { id: 'willis', label: 'Willis Tower, Chicago', coordinates: { lat: 41.8789, lng: -87.6359 } },
  { id: 'millennium', label: 'Millennium Park, Chicago', coordinates: { lat: 41.8826, lng: -87.6226 } },
  { id: 'merchmart', label: 'Merchandise Mart, Chicago', coordinates: { lat: 41.8884, lng: -87.6354 } },
  { id: 'pedway1', label: 'Chicago Pedway – Randolph & Wabash', coordinates: { lat: 41.8841, lng: -87.6264 } },
  { id: 'block37', label: 'Block 37, Chicago', coordinates: { lat: 41.8837, lng: -87.6278 } },
  // Buildings (Jackson Blvd)
  { id: 'depaul_center', label: 'DePaul Center (1 E Jackson Blvd)', coordinates: { lat: 41.8789, lng: -87.6267 } },
  { id: 'lewis_center', label: 'Lewis Center (25 E Jackson Blvd)', coordinates: { lat: 41.8789, lng: -87.6260 } },
  { id: 'daley_building', label: 'Daley Building (14 E Jackson Blvd)', coordinates: { lat: 41.8787, lng: -87.6264 } },
  { id: 'cna_building', label: 'DePaul CDM at CNA Building (Chicago)', coordinates: { lat: 41.8784, lng: -87.6260 } },
  // Metra stations (Loop)
  { id: 'metra-union', label: 'Union Station (Metra)', coordinates: { lat: 41.8786, lng: -87.6406 } },
  { id: 'metra-ogilvie', label: 'Ogilvie Transportation Center (Metra)', coordinates: { lat: 41.8827, lng: -87.6403 } },
  { id: 'metra-lasalle', label: 'LaSalle Street Station (Metra)', coordinates: { lat: 41.8755, lng: -87.6324 } },
  { id: 'metra-millennium', label: 'Millennium Station (Metra Electric)', coordinates: { lat: 41.8859, lng: -87.6235 } },
  { id: 'metra-vanburen', label: 'Van Buren Street (Metra Electric)', coordinates: { lat: 41.8773, lng: -87.6288 } },
  // CTA L stations (Loop & downtown)
  { id: 'cta-adams-wabash', label: 'Adams/Wabash (CTA)', coordinates: { lat: 41.8795, lng: -87.6261 } },
  { id: 'cta-washington-wabash', label: 'Washington/Wabash (CTA)', coordinates: { lat: 41.8832, lng: -87.6262 } },
  { id: 'cta-state-lake', label: 'State/Lake (CTA)', coordinates: { lat: 41.8857, lng: -87.6278 } },
  { id: 'cta-clark-lake', label: 'Clark/Lake (CTA)', coordinates: { lat: 41.8857, lng: -87.6309 } },
  { id: 'cta-washington-wells', label: 'Washington/Wells (CTA)', coordinates: { lat: 41.8827, lng: -87.6339 } },
  { id: 'cta-quincy-wells', label: 'Quincy/Wells (CTA)', coordinates: { lat: 41.8787, lng: -87.6337 } },
  { id: 'cta-library', label: 'Harold Washington Library (CTA)', coordinates: { lat: 41.8769, lng: -87.6282 } },
  { id: 'cta-monroe-blue', label: 'Monroe (Blue Line)', coordinates: { lat: 41.8807, lng: -87.6294 } },
  { id: 'cta-washington-dearborn', label: 'Washington (Blue Line)', coordinates: { lat: 41.8832, lng: -87.6294 } },
  { id: 'cta-jackson-dearborn', label: 'Jackson (Blue Line)', coordinates: { lat: 41.8782, lng: -87.6293 } },
  { id: 'cta-jackson-state', label: 'Jackson (Red Line)', coordinates: { lat: 41.8782, lng: -87.6276 } },
  { id: 'cta-monroe-state', label: 'Monroe (Red Line)', coordinates: { lat: 41.8807, lng: -87.6277 } },
  { id: 'cta-harrison', label: 'Harrison (Red Line)', coordinates: { lat: 41.874, lng: -87.6275 } },
  { id: 'cta-lasalle-vanburen', label: 'LaSalle/Van Buren (CTA)', coordinates: { lat: 41.8769, lng: -87.6317 } },
  { id: 'cta-lasalle', label: 'LaSalle (Blue Line)', coordinates: { lat: 41.8756, lng: -87.6317 } },
  { id: 'cta-clinton-lake', label: 'Clinton (Green/Pink)', coordinates: { lat: 41.8857, lng: -87.6418 } },
  { id: 'cta-clinton-congress', label: 'Clinton (Blue Line)', coordinates: { lat: 41.8755, lng: -87.641 } },
  { id: 'cta-merchandise-mart', label: 'Merchandise Mart (CTA Brown/Purple)', coordinates: { lat: 41.889, lng: -87.634 } },
  { id: 'cta-roosevelt-wabash', label: 'Roosevelt (Orange/Green)', coordinates: { lat: 41.8674, lng: -87.6266 } },
  { id: 'cta-roosevelt-state', label: 'Roosevelt (Red Line)', coordinates: { lat: 41.8674, lng: -87.6274 } },
];

function isNear(a, b, threshold = 0.0002) {
  return Math.abs(a.lat - b.lat) < threshold && Math.abs(a.lng - b.lng) < threshold;
}

// When user types, put matching SUGGESTED_PLACES (transit, DePaul buildings, etc.) first
function prioritizeSuggestedMatches(query, results) {
  const lower = query.toLowerCase();
  const suggestedMatches = SUGGESTED_PLACES.filter((p) =>
    p.label.toLowerCase().includes(lower)
  );
  if (suggestedMatches.length === 0) return results;

  const seen = new Set(suggestedMatches.map((p) => `${p.coordinates.lat},${p.coordinates.lng}`));
  const rest = results.filter((r) => {
    const key = `${r.coordinates.lat},${r.coordinates.lng}`;
    if (seen.has(key)) return false;
    const dup = suggestedMatches.some((t) => isNear(r.coordinates, t.coordinates));
    if (dup) return false;
    return true;
  });
  return [...suggestedMatches, ...rest];
}

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
      const mapboxResults = features.map((f, i) => ({
        id: f.id || `mapbox-${i}`,
        label: f.place_name || f.text || 'Unknown',
        coordinates: {
          lat: f.center[1],
          lng: f.center[0],
        },
      }));
      return prioritizeSuggestedMatches(q, mapboxResults);
    } catch (err) {
      console.warn('Mapbox geocode failed, using fallback:', err?.message);
    }
  }

  // Fallback: substring match on suggested places
  const lower = q.toLowerCase();
  const matches = SUGGESTED_PLACES.filter((p) => p.label.toLowerCase().includes(lower));
  return prioritizeSuggestedMatches(q, matches);
}
