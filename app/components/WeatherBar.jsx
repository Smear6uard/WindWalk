import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/colors';
import { useRoute } from '../context/RouteContext';

export default function WeatherBar() {
  const { weather, weatherLoading, refreshWeather, theme } = useRoute();

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleRefresh = async () => {
    await refreshWeather({ force: true });
  };

  const temp = weather?.temp_f ?? 28;
  const feelsLike = weather?.feels_like_f ?? weather?.computed_wind_chill_f ?? temp;
  const windSpeed = weather?.wind_speed_mph ?? 18;
  const windDirection = weather?.wind_direction ?? 'NNW';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.city}>Chicago Loop</Text>
        <Text style={styles.meta}>
          Wind {windSpeed} mph {windDirection} | Feels like {Math.round(feelsLike)}F
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.temp}>{Math.round(temp)}F</Text>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={weatherLoading}
          accessibilityLabel="Refresh weather forecast"
        >
          {weatherLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="refresh" size={16} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginVertical: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {
      flex: 1,
      paddingRight: 8,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    city: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    temp: {
      color: colors.accent,
      fontSize: 20,
      fontWeight: '700',
    },
    meta: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    refreshBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
