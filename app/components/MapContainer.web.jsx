import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import WebMap from './WebMap';
import colors from '../constants/colors';
import { MAP_COLORS } from '../constants/mapConfig';
import { useRoute } from '../context/RouteContext';
import { getColoredRouteSegments } from '../utils/routeUtils';

export default function MapContainer() {
  const { routes, activeRoute, origin, destination, windStreets } = useRoute();
  const [showWindStreets, setShowWindStreets] = useState(true);

  const selected = useMemo(() => {
    if (!routes || !routes.length) return null;
    return routes.find((r) => r.id === activeRoute) ?? routes[0];
  }, [routes, activeRoute]);

  const routeCoords = useMemo(() => {
    if (!selected?.geometry?.coordinates) return [];
    return selected.geometry.coordinates.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }));
  }, [selected]);

  const coloredSegments = useMemo(() => {
    if (!selected?.geometry || !selected?.segments?.length) return [];
    return getColoredRouteSegments(selected.geometry, selected.segments);
  }, [selected]);

  // Always show map (Loop view); overlay windy streets and/or route when available

  const totalSegments = (selected?.segments ?? []).length;
  const pedwaySegments = (selected?.segments ?? []).filter(
    (s) => s.type === 'pedway'
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        <WebMap
          routeCoords={routeCoords}
          coloredSegments={coloredSegments}
          origin={origin}
          destination={destination}
          windStreets={showWindStreets ? windStreets : null}
        />
      </View>
      {windStreets?.features?.length > 0 && (
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
            accessibilityLabel="Toggle wind tunnel streets on map"
          />
        </View>
      )}
      {selected && (
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
      )}
      {!selected && (
        <View style={styles.infoRow}>
          <Text style={styles.heading}>
            {windStreets?.features?.length > 0 ? 'Wind map' : 'Chicago Loop'}
          </Text>
          <Text style={styles.sub}>
            {windStreets?.features?.length > 0
              ? `Streets in red are wind tunnels for current wind (${windStreets.wind_direction}). Enter addresses to plan a route that avoids them.`
              : 'Enter start and end addresses to plan your pedway route. Start the backend to see wind tunnel streets.'}
          </Text>
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
    height: 200,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
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
