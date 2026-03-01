import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import MapContainer from './components/MapContainer';
import { RouteProvider, useRoute } from './context/RouteContext';
import PedwayMapScreen from './screens/PedwayMapScreen';
import SearchPresetsScreen from './screens/SearchPresetsScreen';

const TEST_ORIGIN = { lat: 41.8781, lng: -87.6298, label: 'Current Location' };
const TEST_DESTINATION = { lat: 41.8827, lng: -87.6233, label: 'Art Institute of Chicago' };

const DEMO_COMFORT_PATH = [
  [41.8781, -87.6298],
  [41.8794, -87.6284],
  [41.8808, -87.627],
  [41.882, -87.6252],
  [41.8827, -87.6233],
];

const DEMO_SHORTEST_PATH = [
  [41.8781, -87.6298],
  [41.8796, -87.6291],
  [41.8809, -87.6279],
  [41.8827, -87.6233],
];

const DEMO_PEDWAY_SEGMENTS = [
  [
    [41.8804, -87.6279],
    [41.8814, -87.6279],
    [41.8814, -87.6264],
  ],
];

const FALLBACK_WEATHER = {
  temp_f: 28,
  wind_speed_mph: 18,
  wind_direction: 'NW',
};

const FALLBACK_ROUTES = {
  shortest: {
    duration_min: 5,
    distance_m: 483,
    feels_like_avg_f: 8,
  },
  comfort: {
    duration_min: 7,
    distance_m: 644,
    feels_like_avg_f: 22,
  },
};

function normalizeRouteSet(routes) {
  if (!routes) {
    return FALLBACK_ROUTES;
  }

  if (Array.isArray(routes)) {
    const shortest = routes.find((route) => route.id === 'shortest') ?? FALLBACK_ROUTES.shortest;
    const comfort = routes.find((route) => route.id === 'comfort') ?? FALLBACK_ROUTES.comfort;
    return { shortest, comfort };
  }

  return {
    shortest: routes.shortest ?? FALLBACK_ROUTES.shortest,
    comfort: routes.comfort ?? FALLBACK_ROUTES.comfort,
  };
}

function routeCardModel(route, fallback) {
  const duration = route?.duration_min ?? fallback.duration_min;
  const distanceM = route?.distance_m ?? fallback.distance_m;
  const distanceMiles = (distanceM * 0.000621371).toFixed(1);
  const feelsLike = Math.round(route?.feels_like_avg_f ?? route?.feels_like_f ?? fallback.feels_like_avg_f);

  return {
    duration,
    distanceMiles,
    feelsLike,
  };
}

function WeatherStat({ icon, iconColor, text }) {
  return (
    <View style={styles.weatherStat}>
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={styles.weatherStatText}>{text}</Text>
    </View>
  );
}

function RouteCard({
  variant,
  title,
  duration,
  distanceMiles,
  feelsLike,
  subtitle,
  selected,
  onPress,
}) {
  const isRecommended = variant === 'comfort';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.routeCard,
        variant === 'direct' ? styles.routeCardDirect : styles.routeCardComfort,
        selected && styles.routeCardSelected,
      ]}
    >
      {isRecommended ? (
        <View style={styles.recommendedPill}>
          <MaterialIcons name="star" size={12} color="#ffffff" />
          <Text style={styles.recommendedText}>Recommended</Text>
        </View>
      ) : null}

      <Text style={[styles.routeTitle, variant === 'comfort' ? styles.routeTitleComfort : styles.routeTitleDirect]}>
        {title}
      </Text>

      <View style={styles.durationRow}>
        <Text style={styles.durationValue}>{duration}</Text>
        <Text style={styles.durationUnit}>min</Text>
      </View>

      <View style={[styles.feelsBox, variant === 'comfort' ? styles.feelsBoxComfort : styles.feelsBoxDirect]}>
        <Text style={[styles.feelsValue, variant === 'comfort' ? styles.feelsValueComfort : styles.feelsValueDirect]}>
          {feelsLike}F
        </Text>
        <Text
          style={[
            styles.feelsLabel,
            variant === 'comfort' ? styles.feelsLabelComfort : styles.feelsLabelDirect,
          ]}
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.routeMetaRow}>
        <MaterialIcons name="straighten" size={12} color="#64748b" />
        <Text style={styles.routeMetaText}>{distanceMiles} mi</Text>
      </View>

      <View style={[styles.actionButton, variant === 'comfort' ? styles.actionButtonComfort : styles.actionButtonDirect]}>
        <Text style={[styles.actionButtonText, variant === 'comfort' ? styles.actionButtonTextComfort : styles.actionButtonTextDirect]}>
          {variant === 'comfort' ? 'Start Navigation' : 'Select'}
        </Text>
      </View>
    </Pressable>
  );
}

function AppContent({ onNavigate }) {
  const { weather, routes, activeRoute, setActiveRoute, loading, fetchRoutesWithStops, setOrigin, setDestination } = useRoute();
  const [originText, setOriginText] = useState(TEST_ORIGIN.label);
  const [destinationText, setDestinationText] = useState(TEST_DESTINATION.label);
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOrigin(TEST_ORIGIN);
    setDestination(TEST_DESTINATION);
    fetchRoutesWithStops(TEST_ORIGIN, TEST_DESTINATION);
  }, [fetchRoutesWithStops, setDestination, setOrigin]);

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const weatherDisplay = weather ?? FALLBACK_WEATHER;
  const routeSet = useMemo(() => normalizeRouteSet(routes), [routes]);
  const directCard = routeCardModel(routeSet.shortest, FALLBACK_ROUTES.shortest);
  const comfortCard = routeCardModel(routeSet.comfort, FALLBACK_ROUTES.comfort);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.weatherBar}>
        <View style={styles.wordmarkRow}>
          <Text style={[styles.wordmarkLetter, styles.wordmarkBlue]}>WIND</Text>
          <Text style={[styles.wordmarkLetter, styles.wordmarkGreen]}>WA</Text>
          <Text style={[styles.wordmarkLetter, styles.wordmarkYellow]}>L</Text>
          <Text style={[styles.wordmarkLetter, styles.wordmarkRed]}>K</Text>
        </View>

        <View style={styles.weatherBarRight}>
          <WeatherStat icon="thermometer" iconColor="#3b82f6" text={`${Math.round(weatherDisplay.temp_f ?? 28)}F`} />
          <View style={styles.weatherDivider} />
          <WeatherStat
            icon="weather-windy"
            iconColor="#22c55e"
            text={`${Math.round(weatherDisplay.wind_speed_mph ?? 18)} mph ${weatherDisplay.wind_direction ?? 'NW'}`}
          />
          <Pressable style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={18} color="#475569" />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchShell}>
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <MaterialIcons name="my-location" size={18} color="#3b82f6" />
            <TextInput
              style={styles.searchInput}
              value={originText}
              onChangeText={setOriginText}
              placeholder="Current Location"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View style={styles.searchDivider} />
          <View style={styles.searchRow}>
            <MaterialIcons name="location-on" size={18} color="#ef4444" />
            <TextInput
              style={styles.searchInput}
              value={destinationText}
              onChangeText={setDestinationText}
              placeholder="Where to?"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      </View>

      <View style={styles.mapArea}>
        <MapContainer
          origin={[TEST_ORIGIN.lat, TEST_ORIGIN.lng]}
          destination={[TEST_DESTINATION.lat, TEST_DESTINATION.lng]}
          comfortRoute={DEMO_COMFORT_PATH}
          shortestRoute={DEMO_SHORTEST_PATH}
          pedwaySegments={DEMO_PEDWAY_SEGMENTS}
          disableRemoteData
        />

        <View style={styles.youBadge}>
          <Text style={styles.youBadgeText}>You</Text>
        </View>

        <View style={styles.zoneBadge}>
          <View style={styles.zoneIconWrap}>
            <MaterialCommunityIcons name="weather-windy" size={16} color="#22c55e" />
          </View>
          <View>
            <Text style={styles.zoneLabel}>Current Zone</Text>
            <Text style={styles.zoneValue}>Low Wind Area</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.cardsStrip,
            {
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsContent}>
            <RouteCard
              variant="direct"
              title="Direct Route"
              duration={directCard.duration}
              distanceMiles={directCard.distanceMiles}
              feelsLike={directCard.feelsLike}
              subtitle="High Wind Chill"
              selected={activeRoute === 'shortest'}
              onPress={() => setActiveRoute('shortest')}
            />
            <RouteCard
              variant="comfort"
              title="WindWalk"
              duration={comfortCard.duration}
              distanceMiles={comfortCard.distanceMiles}
              feelsLike={comfortCard.feelsLike}
              subtitle="Sheltered Route"
              selected={activeRoute === 'comfort'}
              onPress={() => setActiveRoute('comfort')}
            />
          </ScrollView>
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.loadingText}>Finding your warmest route...</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('route')}>
          <MaterialIcons name="map" size={26} color="#3b82f6" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Route</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('search')}>
          <MaterialIcons name="favorite-border" size={24} color="#94a3b8" />
          <Text style={styles.navLabel}>Saved</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('pedway')}>
          <Ionicons name="person-outline" size={23} color="#94a3b8" />
          <Text style={styles.navLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ScreenRouter() {
  const [activeScreen, setActiveScreen] = useState('route');
  const { weather } = useRoute();

  if (activeScreen === 'search') {
    return <SearchPresetsScreen onNavigate={setActiveScreen} weather={weather} />;
  }

  if (activeScreen === 'pedway') {
    return <PedwayMapScreen onNavigate={setActiveScreen} />;
  }

  return <AppContent onNavigate={setActiveScreen} />;
}

export default function App() {
  return (
    <RouteProvider>
      <ScreenRouter />
    </RouteProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  weatherBar: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wordmarkLetter: {
    fontSize: 20,
    letterSpacing: -0.2,
    fontFamily: 'sans-serif-medium',
  },
  wordmarkBlue: {
    color: '#3b82f6',
  },
  wordmarkGreen: {
    color: '#22c55e',
  },
  wordmarkYellow: {
    color: '#eab308',
  },
  wordmarkRed: {
    color: '#ef4444',
  },
  weatherBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherStatText: {
    color: '#334155',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  weatherDivider: {
    width: 1,
    height: 15,
    backgroundColor: '#bfdbfe',
  },
  settingsButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchShell: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchCard: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 42,
  },
  searchDivider: {
    height: 1,
    marginLeft: 28,
    backgroundColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'sans-serif-medium',
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  youBadge: {
    position: 'absolute',
    top: 26,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  youBadgeText: {
    color: '#0f172a',
    fontSize: 10,
    fontFamily: 'sans-serif-medium',
  },
  zoneBadge: {
    position: 'absolute',
    right: 12,
    bottom: 240,
    maxWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoneIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: {
    color: '#64748b',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  zoneValue: {
    color: '#16a34a',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  cardsStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 8,
  },
  cardsContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  routeCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: 190,
  },
  routeCardDirect: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    minHeight: 186,
  },
  routeCardComfort: {
    backgroundColor: '#ffffff',
    borderColor: '#3b82f6',
    minHeight: 204,
    width: 212,
  },
  routeCardSelected: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 5,
  },
  recommendedPill: {
    alignSelf: 'center',
    marginTop: -22,
    marginBottom: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recommendedText: {
    color: '#ffffff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'sans-serif-medium',
  },
  routeTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 6,
    fontFamily: 'sans-serif-medium',
  },
  routeTitleDirect: {
    color: '#64748b',
  },
  routeTitleComfort: {
    color: '#3b82f6',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  durationValue: {
    color: '#0f172a',
    fontSize: 32,
    lineHeight: 34,
    fontFamily: 'sans-serif-medium',
  },
  durationUnit: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  feelsBox: {
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  feelsBoxDirect: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  feelsBoxComfort: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  feelsValue: {
    fontSize: 30,
    lineHeight: 32,
    fontFamily: 'sans-serif-medium',
  },
  feelsValueDirect: {
    color: '#ef4444',
  },
  feelsValueComfort: {
    color: '#3b82f6',
  },
  feelsLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: 'sans-serif-medium',
  },
  feelsLabelDirect: {
    color: '#ef4444',
  },
  feelsLabelComfort: {
    color: '#2563eb',
  },
  routeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  routeMetaText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'sans-serif-medium',
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDirect: {
    backgroundColor: '#f1f5f9',
  },
  actionButtonComfort: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 11,
    fontFamily: 'sans-serif-medium',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionButtonTextDirect: {
    color: '#475569',
  },
  actionButtonTextComfort: {
    color: '#ffffff',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  bottomNav: {
    height: 68,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: 'sans-serif-medium',
  },
  navLabelActive: {
    color: '#3b82f6',
  },
});
