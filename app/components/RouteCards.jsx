import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute } from '../context/RouteContext';
import { colors } from '../constants/colors';

function RouteCard({ route, label, icon, isActive, onPress, accentColor, recommended }) {
  if (!route) return null;

  const miles = (route.distance_m * 0.000621371).toFixed(1);
  const feels = route.feels_like_avg_f ?? route.feels_like_f;
  const emoji = feels < 10 ? '🥶' : feels < 25 ? '😐' : '😊';
  const pedwayCount = route.pedway_segments ?? 0;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isActive && { borderWidth: 2, borderColor: accentColor },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {(recommended || label) && (
        <View style={styles.topRow}>
          {recommended && (
            <Text style={[styles.recommendedBadge, { color: accentColor }]}>
              RECOMMENDED
            </Text>
          )}
          <Text style={styles.label}>
            {icon} {label}
          </Text>
        </View>
      )}
      <Text style={styles.duration}>{route.duration_min ?? 0} min</Text>
      <Text style={styles.distance}>{miles} miles</Text>
      <View style={styles.feelsRow}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.feelsTemp, { color: accentColor }]}>
          {Math.round(feels ?? 0)}°F
        </Text>
      </View>
      <Text style={styles.windExposure}>
        {(route.wind_exposure ?? '').toUpperCase()}
      </Text>
      {pedwayCount > 0 && (
        <View style={styles.pedwayBadge}>
          <Text style={styles.pedwayText}>
            🚇 {pedwayCount} Pedway tunnel{pedwayCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function RouteCards() {
  const { routes, activeRoute, setActiveRoute } = useRoute();

  if (routes == null) return null;

  const list = Array.isArray(routes)
    ? { shortest: routes.find((r) => r.id === 'shortest'), comfort: routes.find((r) => r.id === 'comfort') }
    : routes;

  const hasNoRoutes = !list.shortest && !list.comfort;
  if (hasNoRoutes) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No routes found. Try different locations.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RouteCard
        route={list.shortest}
        label="Shortest"
        icon="🏃"
        isActive={activeRoute === 'shortest'}
        onPress={() => setActiveRoute('shortest')}
        accentColor="#FF6B6B"
        recommended={false}
      />
      <RouteCard
        route={list.comfort}
        label="WindWalk"
        icon="⭐"
        isActive={activeRoute === 'comfort'}
        onPress={() => setActiveRoute('comfort')}
        accentColor="#4ECDC4"
        recommended
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  container: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  recommendedBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 14,
    color: colors.text,
  },
  duration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  feelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  emoji: {
    fontSize: 20,
  },
  feelsTemp: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  windExposure: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  pedwayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pedway,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pedwayText: {
    fontSize: 12,
    color: colors.text,
  },
});
