import { useState, useRef } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRoute } from '../context/RouteContext';
import { geocode } from '../utils/geocode';
import { colors } from '../constants/colors';

const INPUT_BG = '#16213e';

export default function SearchPanel() {
  const {
    origin,
    setOrigin,
    destination,
    setDestination,
    fetchRoutes,
    loading,
    error,
  } = useRoute();

  const [originText, setOriginText] = useState(origin?.label ?? '');
  const [destText, setDestText] = useState(destination?.label ?? '');

  const originInputRef = useRef(null);
  const destInputRef = useRef(null);

  const handleOriginSubmit = () => {
    const text = originText.trim();
    if (text) geocode(text, (result) => {
      setOrigin(result);
      setOriginText(result.label ?? text);
    });
  };

  const handleDestSubmit = () => {
    const text = destText.trim();
    if (text) geocode(text, (result) => {
      setDestination(result);
      setDestText(result.label ?? text);
    });
  };

  const handleMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission denied. Enter your origin manually.',
          [{ text: 'OK' }]
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const label = '📍 My Location';
      setOrigin({ lat: latitude, lng: longitude, label });
      setOriginText(label);
    } catch (err) {
      console.error('Location error:', err);
    }
  };

  const handleFindRoute = () => {
    fetchRoutes();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.dot} />
        <TextInput
          ref={originInputRef}
          style={styles.input}
          placeholder="Origin"
          placeholderTextColor={colors.textMuted}
          value={originText}
          onChangeText={setOriginText}
          onSubmitEditing={handleOriginSubmit}
          returnKeyType="done"
        />
      </View>
      <View style={styles.inputRow}>
        <View style={[styles.dot, styles.dotRed]} />
        <TextInput
          ref={destInputRef}
          style={styles.input}
          placeholder="Destination"
          placeholderTextColor={colors.textMuted}
          value={destText}
          onChangeText={setDestText}
          onSubmitEditing={handleDestSubmit}
          returnKeyType="done"
        />
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleMyLocation}>
          <Text style={styles.buttonText}>📍 My Location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={handleFindRoute}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Finding routes...' : '🔍 Find Warm Route'}
          </Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <Text style={styles.errorText}>Couldn{"'"}t fetch routes — check connection</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    padding: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 10,
  },
  dotRed: {
    backgroundColor: colors.danger,
  },
  input: {
    flex: 1,
    backgroundColor: INPUT_BG,
    color: colors.text,
    fontSize: 14,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.comfort,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
  },
});
