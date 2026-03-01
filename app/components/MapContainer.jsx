import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import { useRoute } from '../context/RouteContext';

export default function MapContainer() {
  const { routes, activeRoute } = useRoute();

  const selected = useMemo(() => {
    if (!routes || !routes.length) return null;
    return routes.find((r) => r.id === activeRoute) ?? routes[0];
  }, [routes, activeRoute]);

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
      <Text style={styles.heading}>Route overview</Text>
      <Text style={styles.sub}>
        {selected.label} • {(selected.distance_m / 1000).toFixed(2)} km •{' '}
        {selected.duration_min} min
      </Text>
      <View style={styles.badgesRow}>
        <View style={[styles.badge, styles.badgePedway]}>
          <Text style={styles.badgeText}>
            {pedwaySegments}/{totalSegments} segments on pedway
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeWind]}>
          <Text style={styles.badgeText}>Wind: {selected.wind_exposure}</Text>
        </View>
      </View>
      <Text style={styles.helper}>
        (You can later plug in a map component here to draw the route geometry.)
      </Text>
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
    padding: 12,
    justifyContent: 'center',
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
    flex: 1,
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

