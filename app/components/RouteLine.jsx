import React from 'react';
import { Polyline } from 'react-native-maps';
import { MAP_COLORS } from '../constants/mapConfig';

export default function RouteLine({ comfortRoute = [], shortestRoute = [], activeRoute }) {
  const comfortActive = activeRoute !== 'shortest';
  const shortestActive = activeRoute === 'shortest';

  return (
    <>
      {shortestRoute.length > 1 ? (
        <Polyline
          coordinates={shortestRoute}
          strokeColor={shortestActive ? MAP_COLORS.shortestRoute : `${MAP_COLORS.shortestRoute}90`}
          strokeWidth={shortestActive ? 6 : 4}
          lineDashPattern={[10, 8]}
          zIndex={9}
        />
      ) : null}

      {comfortRoute.length > 1 ? (
        <Polyline
          coordinates={comfortRoute}
          strokeColor={comfortActive ? MAP_COLORS.comfortRoute : `${MAP_COLORS.comfortRoute}90`}
          strokeWidth={comfortActive ? 6 : 4}
          zIndex={10}
        />
      ) : null}
    </>
  );
}
