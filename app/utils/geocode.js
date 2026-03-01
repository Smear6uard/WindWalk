const LOOP_VIEWBOX = '-87.642,41.89,-87.622,41.873';

const SUGGESTED_PLACES = [
  { id: 'willis', label: 'Willis Tower, Chicago', coordinates: { lat: 41.8789, lng: -87.6359 } },
  { id: 'millennium', label: 'Millennium Park, Chicago', coordinates: { lat: 41.8826, lng: -87.6226 } },
  { id: 'merchmart', label: 'Merchandise Mart, Chicago', coordinates: { lat: 41.8884, lng: -87.6354 } },
  { id: 'block37', label: 'Block 37, Chicago', coordinates: { lat: 41.8837, lng: -87.6278 } },
  {
    id: 'depaul_center',
    label: 'DePaul Center (1 E Jackson Blvd)',
    aliases: ['depaul', 'jcdm', 'jarvis college', 'cdm', 'depaul jcdm building'],
    coordinates: { lat: 41.8789, lng: -87.6267 },
  },
  {
    id: 'depaul_cdm',
    label: 'DePaul CDM (243 S Wabash Ave)',
    aliases: ['depaul cdm', 'jcdm', 'jarvis college of computing', 'college of computing'],
    coordinates: { lat: 41.8786, lng: -87.6262 },
  },
  {
    id: 'lewis_center',
    label: 'Lewis Center (25 E Jackson Blvd)',
    aliases: ['lewis', 'depaul lewis'],
    coordinates: { lat: 41.8789, lng: -87.626 },
  },
  { id: 'metra-union', label: 'Union Station (Metra)', aliases: ['union station'], coordinates: { lat: 41.8786, lng: -87.6406 } },
  { id: 'metra-ogilvie', label: 'Ogilvie Transportation Center (Metra)', aliases: ['ogilvie'], coordinates: { lat: 41.8827, lng: -87.6403 } },
  { id: 'metra-lasalle', label: 'LaSalle Street Station (Metra)', aliases: ['lasalle metra'], coordinates: { lat: 41.8755, lng: -87.6324 } },
  { id: 'metra-millennium', label: 'Millennium Station (Metra Electric)', aliases: ['millennium station'], coordinates: { lat: 41.8859, lng: -87.6235 } },
  { id: 'cta-adams-wabash', label: 'Adams/Wabash (CTA)', aliases: ['adams wabash'], coordinates: { lat: 41.8795, lng: -87.6261 } },
  { id: 'cta-washington-wabash', label: 'Washington/Wabash (CTA)', aliases: ['washington wabash'], coordinates: { lat: 41.8832, lng: -87.6262 } },
  { id: 'cta-state-lake', label: 'State/Lake (CTA)', aliases: ['state lake'], coordinates: { lat: 41.8857, lng: -87.6278 } },
  { id: 'cta-clark-lake', label: 'Clark/Lake (CTA)', aliases: ['clark lake'], coordinates: { lat: 41.8857, lng: -87.6309 } },
  { id: 'cta-jackson-blue', label: 'Jackson (Blue Line)', aliases: ['jackson blue'], coordinates: { lat: 41.8782, lng: -87.6293 } },
  { id: 'cta-jackson-red', label: 'Jackson (Red Line)', aliases: ['jackson red'], coordinates: { lat: 41.8782, lng: -87.6276 } },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTokens(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];

  const tokenMap = {
    jcdm: 'cdm',
    jarvis: 'cdm',
    depaul: 'depaul',
  };

  return normalized
    .split(' ')
    .filter(Boolean)
    .map((token) => tokenMap[token] || token);
}

function matchScore(place, tokens) {
  if (!tokens.length) return 0;
  const haystack = normalizeText(`${place.label} ${(place.aliases || []).join(' ')}`);
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += haystack.startsWith(token) ? 3 : 1;
    }
  }
  return score;
}

function rankSuggested(query) {
  const tokens = queryTokens(query);
  if (!tokens.length) {
    return [...SUGGESTED_PLACES];
  }

  return SUGGESTED_PLACES
    .map((place) => ({ place, score: matchScore(place, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.place);
}

function dedupeByLabel(results) {
  const seen = new Set();
  return results.filter((item) => {
    const key = normalizeText(item.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queryNominatim(query) {
  const encoded = encodeURIComponent(query);
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&countrycodes=us` +
    `&bounded=1&viewbox=${encodeURIComponent(LOOP_VIEWBOX)}&q=${encoded}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Nominatim geocode failed (${response.status})`);
  }

  const results = await response.json();
  return (Array.isArray(results) ? results : []).map((entry, index) => ({
    id: entry.place_id ? `osm-${entry.place_id}` : `osm-${index}`,
    label: entry.display_name || entry.name || query,
    coordinates: {
      lat: Number(entry.lat),
      lng: Number(entry.lon),
    },
  }));
}

export async function geocodeAddress(query) {
  const q = (query || '').trim();
  if (!q) {
    return [...SUGGESTED_PLACES];
  }

  const rankedSuggested = rankSuggested(q);
  if (rankedSuggested.length >= 3) {
    return rankedSuggested.slice(0, 10);
  }

  try {
    const osmResults = await queryNominatim(q);
    return dedupeByLabel([...rankedSuggested, ...osmResults]).slice(0, 10);
  } catch {
    return rankedSuggested;
  }
}
