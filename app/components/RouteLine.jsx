import React from 'react';
import { Polyline } from 'react-native-maps';
import { MAP_COLORS } from '../constants/mapConfig';

export default function RouteLine({ comfortRoute = [], shortestRoute = [], activeRoute }) {
  const comfortActive = activeRoute === 'comfort';
  const shortestActive = activeRoute === 'shortest';

  return (
    <>
      {/* Render inactive route first so active draws on top */}
      {shortestRoute.length > 1 ? (
        <Polyline
          coordinates={shortestRoute}
          strokeColor={shortestActive ? MAP_COLORS.shortestRoute : MAP_COLORS.shortestRoute + '40'}
          strokeWidth={shortestActive ? 6 : 3}
          lineDashPattern={shortestActive ? undefined : [8, 6]}
        />
      ) : null}

      {comfortRoute.length > 1 ? (
        <Polyline
          coordinates={comfortRoute}
          strokeColor={comfortActive ? MAP_COLORS.comfortRoute : MAP_COLORS.comfortRoute + '40'}
          strokeWidth={comfortActive ? 6 : 3}
        />
      ) : null}
    </>
  );
}
