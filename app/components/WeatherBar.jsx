import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '../context/RouteContext';
import { API_URL } from '../constants/config';
import { colors } from '../constants/colors';

export default function WeatherBar() {
  const { weather, setWeather } = useRoute();

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/weather`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setWeather(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [setWeather]);

  if (weather == null) return null;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.temp}>{weather.temp_f}°F</Text>
        <Text style={styles.muted}>Feels like {weather.feels_like_f}°F</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.wind}>
          💨 {weather.wind_speed_mph}mph {weather.wind_direction}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  left: {},
  right: {
    alignItems: 'flex-end',
  },
  temp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  muted: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  wind: {
    fontSize: 14,
    color: colors.text,
  },
});
