import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import colors from '../constants/colors';
import { LOOP_CENTER, MAP_COLORS, ZOOM_DEFAULTS } from '../constants/mapConfig';
import { useRoute } from '../context/RouteContext';
import RouteLine from './RouteLine';

function coordsToLatLng(coords) {
  if (!Array.isArray(coords)) return [];
  return coords
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { latitude: lat, longitude: lng };
    })
    .filter(Boolean);
}

function findRouteById(routes, id) {
  if (!routes) return null;
  if (Array.isArray(routes)) {
    return routes.find((route) => route.id === id) || null;
  }
  return routes[id] || null;
}

function getRouteList(routes) {
  if (!routes) return [];
  if (Array.isArray(routes)) return routes;
  return Object.values(routes).filter(Boolean);
}

function toMapPoint(point) {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') {
    return null;
  }
  return { latitude: point.lat, longitude: point.lng };
}

function extractPedwaySegments(route) {
  const coordinates = route?.geometry?.coordinates;
  const segments = route?.segments;
  if (!Array.isArray(coordinates) || !Array.isArray(segments)) return [];
  if (coordinates.length !== segments.length + 1) return [];

  const pedway = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const isPedway = seg?.type === 'pedway' || seg?.is_pedway === true;
    if (!isPedway) continue;
    const pair = coordsToLatLng([coordinates[i], coordinates[i + 1]]);
    if (pair.length === 2) {
      pedway.push(pair);
    }
  }
  return pedway;
}

export default function MapContainer() {
  const { routes, activeRoute, origin, destination, windStreets } = useRoute();
  const [showWindStreets, setShowWindStreets] = useState(true);
  const mapRef = useRef(null);
  const lastFittedPathRef = useRef('');
  const routeList = useMemo(() => getRouteList(routes), [routes]);

  const shortestRoute = useMemo(() => {
    const shortest = findRouteById(routes, 'shortest');
    return coordsToLatLng(shortest?.geometry?.coordinates);
  }, [routes]);

  const comfortRoute = useMemo(() => {
    const comfort = findRouteById(routes, 'comfort');
    return coordsToLatLng(comfort?.geometry?.coordinates);
  }, [routes]);

  const selectedRoute = useMemo(() => {
    const preferred = findRouteById(routes, activeRoute);
    if (preferred) return preferred;
    return (
      findRouteById(routes, 'comfort') ||
      findRouteById(routes, 'shortest') ||
      routeList[0] ||
      null
    );
  }, [activeRoute, routeList, routes]);

  const selectedRouteCoords = useMemo(
    () => coordsToLatLng(selectedRoute?.geometry?.coordinates),
    [selectedRoute]
  );

  const selectedPath = useMemo(() => {
    if (activeRoute === 'shortest' && shortestRoute.length > 1) return shortestRoute;
    if (activeRoute === 'comfort' && comfortRoute.length > 1) return comfortRoute;
    if (comfortRoute.length > 1) return comfortRoute;
    if (shortestRoute.length > 1) return shortestRoute;
    return selectedRouteCoords;
  }, [activeRoute, comfortRoute, selectedRouteCoords, shortestRoute]);

  const pedwaySegments = useMemo(() => extractPedwaySegments(selectedRoute), [selectedRoute]);

  const windyPolylines = useMemo(() => {
    const features = windStreets?.features ?? [];
    return features
      .map((feature, index) => ({
        key: `windy-${index}`,
        coords: coordsToLatLng(feature?.geometry?.coordinates),
      }))
      .filter((entry) => entry.coords.length > 1);
  }, [windStreets]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (selectedPath.length < 2) return;
    const pathKey = selectedPath
      .map((point) => `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`)
      .join('|');
    if (lastFittedPathRef.current === pathKey) return;
    lastFittedPathRef.current = pathKey;

    mapRef.current.fitToCoordinates(selectedPath, {
      edgePadding: { top: 80, right: 60, bottom: 220, left: 60 },
      animated: true,
    });
  }, [selectedPath]);

  const totalSegments = (selectedRoute?.segments ?? []).length;
  const pedwayCount = (selectedRoute?.segments ?? []).filter(
    (segment) => segment.type === 'pedway' || segment.is_pedway === true
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            ...LOOP_CENTER,
            ...ZOOM_DEFAULTS,
          }}
          showsUserLocation={false}
        >
          {showWindStreets &&
            windyPolylines.map(({ key, coords }) => (
              <Polyline
                key={key}
                coordinates={coords}
                strokeColor={MAP_COLORS.windyStreet}
                strokeWidth={2}
                zIndex={1}
              />
            ))}

          <RouteLine
            shortestRoute={shortestRoute}
            comfortRoute={comfortRoute}
            activeRoute={activeRoute}
          />

          {shortestRoute.length <= 1 && comfortRoute.length <= 1 && selectedPath.length > 1 ? (
            <Polyline
              coordinates={selectedPath}
              strokeColor={MAP_COLORS.comfortRoute}
              strokeWidth={5}
              zIndex={9}
            />
          ) : null}

          {pedwaySegments.map((segment, index) => (
            <Polyline
              key={`pedway-${index}`}
              coordinates={segment}
              strokeColor={MAP_COLORS.pedway}
              strokeWidth={6}
              lineDashPattern={[10, 8]}
              zIndex={12}
            />
          ))}

          {origin ? (
            <Marker coordinate={toMapPoint(origin)} title="Origin" pinColor={MAP_COLORS.origin} />
          ) : null}
          {destination ? (
            <Marker coordinate={toMapPoint(destination)} title="Destination" pinColor={MAP_COLORS.destination} />
          ) : null}
        </MapView>
      </View>

      {windStreets?.features?.length > 0 ? (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: MAP_COLORS.windyStreet }]} />
            <Text style={styles.legendText}>Wind tunnel streets</Text>
          </View>
          <Switch
            value={showWindStreets}
            onValueChange={setShowWindStreets}
            trackColor={{ false: colors.surfaceLight, true: colors.accent }}
            thumbColor={colors.text}
            accessibilityLabel="Toggle wind tunnel streets"
          />
        </View>
      ) : null}

      {selectedRoute ? (
        <View style={styles.infoRow}>
          <Text style={styles.heading}>{selectedRoute.label}</Text>
          <Text style={styles.sub}>
            {(selectedRoute.distance_m / 1000).toFixed(2)} km | {selectedRoute.duration_min} min | {pedwayCount}/
            {totalSegments} pedway
          </Text>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, styles.badgeWind]}>
              <Text style={styles.badgeText}>Wind: {selectedRoute.wind_exposure}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.infoRow}>
          <Text style={styles.heading}>Chicago Loop</Text>
          <Text style={styles.sub}>Enter origin and destination to generate shortest and WindWalk paths.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  mapWrap: {
    height: 260,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  infoRow: {
    padding: 12,
  },
  heading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeWind: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
  },
});
