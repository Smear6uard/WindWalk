import React from 'react';
import { Polyline } from 'react-native-maps';
import { MAP_COLORS } from '../constants/mapConfig';

function isCoordinate(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number'
  );
}

export default function PedwayOverlay({ segments = [] }) {
  if (!segments.length) {
    return null;
  }

  const groupedSegments = isCoordinate(segments[0]) ? [segments] : segments;

  return (
    <>
      {groupedSegments.map((segment, index) =>
        segment.length > 1 ? (
          <Polyline
            key={`pedway-${index}`}
            coordinates={segment}
            strokeColor={MAP_COLORS.pedway}
            strokeWidth={6}
            lineDashPattern={[10, 8]}
          />
        ) : null
      )}
    </>
  );
}
