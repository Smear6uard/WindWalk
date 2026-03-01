import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import colors from '../constants/colors';
import { MAP_COLORS, LOOP_CENTER, ZOOM_DEFAULTS } from '../constants/mapConfig';
import { useRoute } from '../context/RouteContext';
import { getColoredRouteSegments } from '../utils/routeUtils';

function coordsToLatLng(coords) {
  if (!coords || !Array.isArray(coords)) return [];
  return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function MapContainer() {
  const { routes, activeRoute, origin, destination } = useRoute();

  const selected = useMemo(() => {
    if (!routes || !routes.length) return null;
    return routes.find((r) => r.id === activeRoute) ?? routes[0];
  }, [routes, activeRoute]);

  const routeCoords = useMemo(() => {
    if (!selected?.geometry?.coordinates) return [];
    return coordsToLatLng(selected.geometry.coordinates);
  }, [selected]);

  const coloredSegments = useMemo(() => {
    if (!selected?.geometry || !selected?.segments?.length) return [];
    return getColoredRouteSegments(selected.geometry, selected.segments);
  }, [selected]);

  const initialRegion = useMemo(() => {
    if (routeCoords.length > 0) {
      const lats = routeCoords.map((c) => c.latitude);
      const lngs = routeCoords.map((c) => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const padding = 0.002;
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.max(maxLat - minLat + padding, 0.005),
        longitudeDelta: Math.max(maxLng - minLng + padding, 0.005),
      };
    }
    return {
      ...LOOP_CENTER,
      ...ZOOM_DEFAULTS,
    };
  }, [routeCoords]);

  if (!selected) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Map preview of your pedway route will appear here.</Text>
      </View>
    );
  }

  const totalSegments = (selected.segments ?? []).length;
  const pedwaySegments = (selected.segments ?? []).filter(
    (s) => s.type === 'pedway'
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <MapView
          key={`route-${activeRoute}-${selected?.id ?? ''}`}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
        >
          {coloredSegments.length > 0
            ? coloredSegments.map((seg, idx) => (
                <Polyline
                  key={`${activeRoute}-${idx}-${seg.type}`}
                  coordinates={coordsToLatLng(seg.coordinates)}
                  strokeColor={
                    seg.type === 'pedway' ? MAP_COLORS.pedway : MAP_COLORS.comfortRoute
                  }
                  strokeWidth={5}
                />
              ))
            : routeCoords.length > 1 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={MAP_COLORS.comfortRoute}
                  strokeWidth={5}
                />
              )}
          {origin && (
            <Marker
              coordinate={{ latitude: origin.lat, longitude: origin.lng }}
              title="Origin"
              pinColor={MAP_COLORS.origin}
            />
          )}
          {destination && (
            <Marker
              coordinate={{ latitude: destination.lat, longitude: destination.lng }}
              title="Destination"
              pinColor={MAP_COLORS.destination}
            />
          )}
        </MapView>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.heading}>{selected.label}</Text>
        <Text style={styles.sub}>
          {(selected.distance_m / 1000).toFixed(2)} km • {selected.duration_min} min •{' '}
          {pedwaySegments}/{totalSegments} pedway
        </Text>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, styles.badgeWind]}>
            <Text style={styles.badgeText}>Wind: {selected.wind_exposure}</Text>
          </View>
        </View>
      </View>
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
    height: 200,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
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
  badgePedway: {
    backgroundColor: colors.pedway,
  },
  badgeWind: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '500',
  },
  helper: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 11,
  },
  empty: {
    flexGrow: 0,
    minHeight: 72,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});

