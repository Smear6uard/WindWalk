import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

// Placeholder static weather bar; can be wired to backend /api/weather later.
export default function WeatherBar() {
  return (
    <View style={styles.container}>
      <Text style={styles.city}>Chicago</Text>
      <Text style={styles.temp}>28°F</Text>
      <Text style={styles.meta}>Wind 22 mph • Feels like 18°F</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 11,
  },
});

