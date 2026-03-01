const PLACES = [
  {
    id: 'block_37',
    label: 'Block 37',
    lat: 41.8839,
    lng: -87.6288,
  },
  {
    id: 'macys_state_washington',
    label: "Macy's (State/Washington)",
    lat: 41.8834,
    lng: -87.6278,
  },
  {
    id: 'chicago_cultural_center',
    label: 'Chicago Cultural Center',
    lat: 41.8846,
    lng: -87.6245,
  },
  {
    id: 'city_hall',
    label: 'City Hall',
    lat: 41.8844,
    lng: -87.6312,
  },
  {
    id: 'daley_center',
    label: 'Daley Center / Daley Plaza',
    lat: 41.8834,
    lng: -87.6294,
  },
  {
    id: 'millennium_station',
    label: 'Millennium Station',
    lat: 41.8848,
    lng: -87.6238,
  },
  {
    id: 'prudential_plaza',
    label: 'Prudential Plaza',
    lat: 41.8844,
    lng: -87.624,
  },
  {
    id: 'union_station',
    label: 'Union Station',
    lat: 41.8788,
    lng: -87.6395,
  },
  {
    id: 'ogilvie_transportation_center',
    label: 'Ogilvie Transportation Center',
    lat: 41.8816,
    lng: -87.6395,
  },
  {
    id: 'randolph_wabash_cta',
    label: 'Randolph/Wabash CTA',
    lat: 41.8846,
    lng: -87.626,
  },
];

/**
 * "Geocode" a query by snapping it to a known Pedway entry point.
 * @param {string} query - The search text (address, place name, etc.)
 * @param {function} setter - Callback receiving { lat, lng, label } for the first result
 * @returns {Promise<void>}
 */
export async function geocode(query, setter) {
  if (!query?.trim()) return;

  const suggestions = await geocodeSuggestions(query, 1);
  if (!suggestions.length) {
    console.error('Geocode: no matching Pedway entry for', query);
    return;
  }

  setter(suggestions[0]);
}

/**
 * Fetch autocomplete-style suggestions for a search query
 * from a fixed list of Pedway entry points.
 * Returns an array of { id, lat, lng, label }.
 *
 * @param {string} query
 * @param {number} [limit=5]
 * @returns {Promise<Array<{id: string, lat: number, lng: number, label: string}>>}
 */
export async function geocodeSuggestions(query, limit = 5) {
  if (!query?.trim()) return [];

  const needle = query.trim().toLowerCase();

  const matches = PLACES.filter((place) =>
    place.label.toLowerCase().includes(needle)
  ).slice(0, limit);

  return matches;
}
