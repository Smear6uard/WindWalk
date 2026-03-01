import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import colors from '../constants/colors';
import { useRoute } from '../context/RouteContext';

export default function RouteCards() {
  const { routes, activeRoute, setActiveRoute } = useRoute();

  if (!routes || !routes.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Enter two addresses to see available pedway routes.</Text>
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
      {routes.map((route) => {
        const isActive = activeRoute === route.id;
        return (
          <TouchableOpacity
            key={route.id}
            style={[styles.card, isActive && styles.cardActive]}
            onPress={() => setActiveRoute(route.id)}
          >
            <Text style={styles.label}>{route.label}</Text>
            <Text style={styles.metric}>
              {(route.distance_m / 1000).toFixed(2)} km • {route.duration_min} min
            </Text>
            <Text style={styles.metric}>
              Feels like {Math.round(route.feels_like_avg_f)}°F • Wind {route.wind_exposure}
            </Text>
            <Text style={styles.metric}>
              Pedway segments: {route.pedway_segments ?? 0}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
  },
  cardActive: {
    borderWidth: 2,
    borderColor: colors.pedway,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metric: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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

