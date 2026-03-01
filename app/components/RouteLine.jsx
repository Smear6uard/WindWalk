import React from 'react';
import { Polyline } from 'react-native-maps';
import { MAP_COLORS } from '../constants/mapConfig';

export default function RouteLine({ comfortRoute = [], shortestRoute = [] }) {
  return (
    <>
      {comfortRoute.length > 1 ? (
        <Polyline
          coordinates={comfortRoute}
          strokeColor={MAP_COLORS.comfortRoute}
          strokeWidth={5}
        />
      ) : null}

      {shortestRoute.length > 1 ? (
        <Polyline
          coordinates={shortestRoute}
          strokeColor={MAP_COLORS.shortestRoute}
          strokeWidth={3}
          lineDashPattern={[8, 6]}
        />
      ) : null}
    </>
  );
}
