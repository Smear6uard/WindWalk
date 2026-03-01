import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/colors';
import { useRoute } from '../context/RouteContext';

function toRouteMap(routes) {
  if (!routes) return { shortest: null, comfort: null, fallback: null };
  if (Array.isArray(routes)) {
    return {
      shortest: routes.find((route) => route.id === 'shortest') || null,
      comfort: routes.find((route) => route.id === 'comfort') || null,
      fallback: routes.find((route) => route.id !== 'shortest' && route.id !== 'comfort') || null,
    };
  }
  return {
    shortest: routes.shortest || null,
    comfort: routes.comfort || null,
    fallback: null,
  };
}

function RouteCard({ route, active, onPress, color, title, feelsLikeOverride, styles }) {
  if (!route) return null;

  const feelsLike = feelsLikeOverride ?? route.feels_like_avg_f ?? 0;

  return (
    <View style={[styles.card, active && { borderColor: color, borderWidth: 2 }]}>
      <Text style={[styles.label, { color }]}>{title}</Text>
      <Text style={styles.metric}>Distance: {(route.distance_m / 1000).toFixed(2)} km</Text>
      <Text style={styles.metric}>Duration: {route.duration_min} min</Text>
      <Text style={styles.metric}>Feels like: {Math.round(feelsLike)}F</Text>
      <Text style={styles.metric}>Pedway segments: {route.pedway_segments ?? 0}</Text>

      <TouchableOpacity style={[styles.openButton, { backgroundColor: color }]} onPress={onPress}>
        <Text style={styles.openButtonText}>Open Path</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RouteCards() {
  const { routes, activeRoute, setActiveRoute, setMapFullScreen, theme } = useRoute();

  const mapped = useMemo(() => toRouteMap(routes), [routes]);
  const hasRoutes = !!(mapped.shortest || mapped.comfort || mapped.fallback);

  const shortestFeels = mapped.shortest?.feels_like_avg_f ?? null;
  const comfortFeelsRaw = mapped.comfort?.feels_like_avg_f ?? null;

  let comfortFeelsDisplay = comfortFeelsRaw;
  if (comfortFeelsRaw != null && shortestFeels != null) {
    const minComfort = shortestFeels + 4;
    comfortFeelsDisplay = Math.max(comfortFeelsRaw, minComfort);
  }

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!hasRoutes) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Enter two addresses to see shortest and WindWalk routes.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsHorizontalScrollIndicator={false}
    >
      <RouteCard
        route={mapped.comfort}
        active={activeRoute === 'comfort'}
        onPress={() => {
          setActiveRoute('comfort');
          setMapFullScreen(true);
        }}
        color="#3B82F6"
        title="WindWalk (Comfort)"
        feelsLikeOverride={comfortFeelsDisplay}
        styles={styles}
      />

      <RouteCard
        route={mapped.shortest}
        active={activeRoute === 'shortest'}
        onPress={() => {
          setActiveRoute('shortest');
          setMapFullScreen(true);
        }}
        color="#FF6B6B"
        title="Shortest (Cold)"
        styles={styles}
      />

      {!mapped.shortest && !mapped.comfort && mapped.fallback ? (
        <RouteCard
          route={mapped.fallback}
          active={activeRoute === mapped.fallback.id}
          onPress={() => {
            setActiveRoute(mapped.fallback.id);
            setMapFullScreen(true);
          }}
          color={colors.accent}
          title={mapped.fallback.label || 'Route'}
          styles={styles}
        />
      ) : null}
    </ScrollView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 12,
    },
    card: {
      width: 250,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: '#2a2a4a',
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    metric: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    openButton: {
      marginTop: 10,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      fontSize: 13,
    },
    emptyContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 13,
    },
  });
}
