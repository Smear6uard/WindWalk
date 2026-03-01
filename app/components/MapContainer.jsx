import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import Markers from './Markers';
import PedwayOverlay from './PedwayOverlay';
import RouteLine from './RouteLine';
import WindOverlay from './WindOverlay';
import { LOOP_CENTER, MAP_COLORS, ZOOM_DEFAULTS } from '../constants/mapConfig';
import useRoutes from '../hooks/useRoutes';
import useWeather from '../hooks/useWeather';

function toMapCoordinate(coord) {
  if (Array.isArray(coord) && coord.length === 2) {
    return {
      latitude: coord[0],
      longitude: coord[1],
    };
  }

  if (
    coord &&
    typeof coord === 'object' &&
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number'
  ) {
    return coord;
  }

  return null;
}

function normalizePath(path = []) {
  return path.map(toMapCoordinate).filter(Boolean);
}

function normalizeSegments(segments = []) {
  if (!segments.length) {
    return [];
  }

  if (Array.isArray(segments[0]) && typeof segments[0][0] === 'number') {
    return [normalizePath(segments)];
  }

  return segments
    .map((segment) => normalizePath(segment))
    .filter((segment) => segment.length > 1);
}

export default function MapContainer({
  origin,
  destination,
  comfortRoute: comfortRouteOverride = [],
  shortestRoute: shortestRouteOverride = [],
  pedwaySegments: pedwaySegmentsOverride = [],
  disableRemoteData = false,
}) {
  const routes = useRoutes(origin, destination, { enabled: !disableRemoteData });
  const weather = useWeather({ enabled: !disableRemoteData });

  const originCoord = useMemo(() => toMapCoordinate(origin), [origin]);
  const destinationCoord = useMemo(() => toMapCoordinate(destination), [destination]);

  const comfortRoute = useMemo(() => {
    if (comfortRouteOverride.length > 0) {
      return normalizePath(comfortRouteOverride);
    }
    return normalizePath(routes?.comfort);
  }, [comfortRouteOverride, routes?.comfort]);

  const shortestRoute = useMemo(() => {
    if (shortestRouteOverride.length > 0) {
      return normalizePath(shortestRouteOverride);
    }
    return normalizePath(routes?.shortest);
  }, [routes?.shortest, shortestRouteOverride]);

  const pedwaySegments = useMemo(() => {
    if (pedwaySegmentsOverride.length > 0) {
      return normalizeSegments(pedwaySegmentsOverride);
    }
    return normalizeSegments(routes?.pedway);
  }, [pedwaySegmentsOverride, routes?.pedway]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          ...LOOP_CENTER,
          ...ZOOM_DEFAULTS,
        }}
      >
        <RouteLine comfortRoute={comfortRoute} shortestRoute={shortestRoute} />
        <PedwayOverlay segments={pedwaySegments} />
        <Markers origin={originCoord} destination={destinationCoord} />
        <WindOverlay weather={weather} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAP_COLORS.background,
  },
  map: {
    flex: 1,
    backgroundColor: MAP_COLORS.background,
  },
});
