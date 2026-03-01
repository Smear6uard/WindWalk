/**
 * Splits route geometry into consecutive segments by type (pedway vs outdoor).
 * Each segment[i] corresponds to the edge from coordinates[i] to coordinates[i+1].
 * Returns array of { type: 'pedway'|'outdoor', coordinates: [[lng,lat],...] }
 */
export function getColoredRouteSegments(geometry, segments) {
  const coords = geometry?.coordinates ?? [];
  if (coords.length < 2 || !segments?.length || segments.length !== coords.length - 1) {
    return [];
  }

  const result = [];
  let currentType = segments[0]?.type === 'pedway' ? 'pedway' : 'outdoor';
  let currentCoords = [coords[0]];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const type = seg?.type === 'pedway' ? 'pedway' : 'outdoor';
    currentCoords.push(coords[i + 1]);

    if (type !== currentType) {
      result.push({ type: currentType, coordinates: currentCoords });
      currentType = type;
      currentCoords = [coords[i + 1]];
    }
  }

  if (currentCoords.length >= 2) {
    result.push({ type: currentType, coordinates: currentCoords });
  }
  return result;
}
