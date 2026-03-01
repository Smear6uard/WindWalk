import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WebMap from './WebMap';
import colors from '../constants/colors';
import { useRoute } from '../context/RouteContext';

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
        <WebMap
          routeCoords={routeCoords}
          origin={origin}
          destination={destination}
        />
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
