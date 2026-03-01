import { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const BG_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAhMkubnGrRswBqHnsQ4q3zRTWnugQDx95cFERmV19g08douMGZP7bzCQm2agcTHNKCJV6NHraFuofS5AIAYdQV_PVLPWRhxsmjkbVVeqQM4FVQ0G3Yu_CWcCdFCkyjeotVTS1ApGRY0PkjNNqPhR_KchYXm_VrLUdVLWgI6mKU4bdVEpCrh3RBz46MRiTm1oixZR2wDaOW-Jc_ESkiFbocd5vN2F1uTcykuVr9ECwIY0ItQJvWc79vqoKwNYhN0PnPuM3hK5_gnj0';

const WEATHER_CARDS = [
  { key: 'temp', label: 'Temp', value: '28F', icon: 'thermometer', color: '#2563EB' },
  { key: 'feels', label: 'Feels Like', value: '14F', icon: 'walk', color: '#10B981' },
  { key: 'wind', label: 'Wind', value: '18 mph', icon: 'weather-windy', color: '#2563EB' },
];

const FAVORITES = [
  {
    key: 'office',
    title: 'Office Commute',
    subtitle: 'Blue Line  LaSalle & Monroe',
    badge: 'Pedway',
    icon: 'briefcase-outline',
  },
  {
    key: 'home',
    title: 'Home',
    subtitle: 'Michigan Ave  Millenium Park',
    badge: '18 min',
    icon: 'home-outline',
  },
  {
    key: 'coffee',
    title: 'Intelligentsia Coffee',
    subtitle: 'Randolph St',
    badge: '5 min',
    icon: 'cafe-outline',
  },
];

function Logo() {
  return (
    <View style={styles.logoRow}>
      <Text style={[styles.logoText, styles.logoBlue]}>WIND</Text>
      <Text style={[styles.logoText, styles.logoGreen]}>WA</Text>
      <Text style={[styles.logoText, styles.logoYellow]}>L</Text>
      <MaterialCommunityIcons name="walk" size={23} color="#ef4444" />
    </View>
  );
}

export default function SearchPresetsScreen({ onNavigate, weather }) {
  const [originText, setOriginText] = useState('Current Location');
  const [destinationText, setDestinationText] = useState('');

  const weatherValues = useMemo(() => {
    const temp = weather?.temp_f != null ? `${Math.round(weather.temp_f)}F` : WEATHER_CARDS[0].value;
    const feels =
      weather?.feels_like_f != null ? `${Math.round(weather.feels_like_f)}F` : WEATHER_CARDS[1].value;
    const wind =
      weather?.wind_speed_mph != null
        ? `${Math.round(weather.wind_speed_mph)} mph`
        : WEATHER_CARDS[2].value;
    return [temp, feels, wind];
  }, [weather]);

  return (
    <SafeAreaView style={styles.root}>
      <ImageBackground source={{ uri: BG_IMAGE }} style={styles.backgroundImage} blurRadius={0.5}>
        <View style={styles.imageDimmer} />
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton}>
            <Ionicons name="menu" size={27} color="#1f2937" />
          </Pressable>
          <Logo />
          <Pressable style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherCardsWrap}>
          {WEATHER_CARDS.map((card, index) => (
            <View key={card.key} style={styles.weatherCard}>
              <MaterialCommunityIcons name={card.icon} size={22} color={card.color} />
              <Text style={styles.weatherLabel}>{card.label}</Text>
              <Text style={styles.weatherValue}>{weatherValues[index]}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.searchCard}>
          <View style={styles.searchConnector} />

          <View style={styles.searchField}>
            <View style={styles.originDot} />
            <TextInput
              value={originText}
              onChangeText={setOriginText}
              placeholder="Current Location"
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
            />
            <Pressable>
              <MaterialIcons name="my-location" size={20} color="#2563EB" />
            </Pressable>
          </View>

          <View style={styles.searchField}>
            <View style={styles.destinationDot} />
            <TextInput
              value={destinationText}
              onChangeText={setDestinationText}
              placeholder="Where to?"
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
            />
          </View>

          <Pressable style={styles.findButton}>
            <MaterialCommunityIcons name="walk" size={18} color="#ffffff" />
            <Text style={styles.findButtonText}>Find Warmest Route</Text>
          </Pressable>
        </View>

        <View style={styles.favoritesHeader}>
          <Text style={styles.favoritesTitle}>Favorites & Recent</Text>
          <Pressable>
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.favoritesList}>
          {FAVORITES.map((item) => (
            <Pressable key={item.key} style={styles.favoriteItem}>
              <View style={styles.favoriteIconWrap}>
                <Ionicons name={item.icon} size={20} color="#ffffff" />
              </View>
              <View style={styles.favoriteTextWrap}>
                <Text numberOfLines={1} style={styles.favoriteTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.favoriteSubtitle}>
                  {item.subtitle}
                </Text>
              </View>
              <View style={styles.badgeWrap}>
                <Text style={styles.favoriteBadge}>{item.badge}</Text>
              </View>
            </Pressable>
          ))}
          <View style={{ height: 86 }} />
        </ScrollView>
      </View>

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('route')}>
          <MaterialIcons name="map" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Explore</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Ionicons name="heart" size={22} color="#2563EB" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Saved</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('pedway')}>
          <Ionicons name="cloud-outline" size={22} color="#6b7280" />
          <Text style={styles.navLabel}>Forecast</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => onNavigate?.('route')}>
          <Ionicons name="person-outline" size={22} color="#6b7280" />
          <Text style={styles.navLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  logoText: {
    fontSize: 25,
    letterSpacing: -0.6,
    fontFamily: 'sans-serif-medium',
  },
  logoBlue: {
    color: '#3b82f6',
  },
  logoGreen: {
    color: '#22c55e',
  },
  logoYellow: {
    color: '#eab308',
  },
  weatherCardsWrap: {
    gap: 10,
    paddingVertical: 8,
    paddingRight: 4,
  },
  weatherCard: {
    width: 112,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 4,
  },
  weatherLabel: {
    color: '#6b7280',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: 'sans-serif-medium',
  },
  weatherValue: {
    color: '#1f2937',
    fontSize: 22,
    fontFamily: 'sans-serif-medium',
  },
  searchCard: {
    marginTop: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: '#ffffff',
    padding: 16,
    position: 'relative',
  },
  searchConnector: {
    position: 'absolute',
    left: 23,
    top: 45,
    width: 1.5,
    height: 38,
    backgroundColor: '#e5e7eb',
  },
  searchField: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 11,
  },
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#ffffff',
  },
  destinationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  findButton: {
    marginTop: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  findButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  favoritesHeader: {
    marginTop: 18,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoritesTitle: {
    color: '#1f2937',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    fontFamily: 'sans-serif-medium',
  },
  editText: {
    color: '#2563EB',
    fontSize: 12,
    fontFamily: 'sans-serif-medium',
  },
  favoritesList: {
    gap: 10,
    paddingBottom: 8,
  },
  favoriteItem: {
    minHeight: 74,
    borderRadius: 16,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  favoriteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteTextWrap: {
    flex: 1,
  },
  favoriteTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'sans-serif-medium',
  },
  favoriteSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  badgeWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  favoriteBadge: {
    color: '#065f46',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontFamily: 'sans-serif-medium',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'rgba(255,255,255,0.96)',
    minHeight: 78,
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navItem: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navLabel: {
    color: '#6b7280',
    fontSize: 10,
  },
  navLabelActive: {
    color: '#2563EB',
    fontFamily: 'sans-serif-medium',
  },
});
