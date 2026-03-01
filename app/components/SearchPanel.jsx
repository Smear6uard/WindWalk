import React, { useState, useRef } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useRoute } from '../context/RouteContext';
import { geocode, geocodeSuggestions } from '../utils/geocode';
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
  const originDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  const loadOriginSuggestions = async (text) => {
    const suggestions = await geocodeSuggestions(text);
    setOriginSuggestions(suggestions);
  };

  const loadDestSuggestions = async (text) => {
    const suggestions = await geocodeSuggestions(text);
    setDestSuggestions(suggestions);
  };

  const handleOriginChange = (text) => {
    setOriginText(text);

    if (originDebounceRef.current) {
      clearTimeout(originDebounceRef.current);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setOriginSuggestions([]);
      return;
    }

    originDebounceRef.current = setTimeout(() => {
      loadOriginSuggestions(trimmed);
    }, 300);
  };

  const handleDestChange = (text) => {
    setDestText(text);

    if (destDebounceRef.current) {
      clearTimeout(destDebounceRef.current);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setDestSuggestions([]);
      return;
    }

    destDebounceRef.current = setTimeout(() => {
      loadDestSuggestions(trimmed);
    }, 300);
  };

  const handleSelectOriginSuggestion = (suggestion) => {
    setOrigin({
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: suggestion.label,
    });
    setOriginText(suggestion.label);
    setOriginSuggestions([]);
  };

  const handleSelectDestSuggestion = (suggestion) => {
    setDestination({
      lat: suggestion.lat,
      lng: suggestion.lng,
      label: suggestion.label,
    });
    setDestText(suggestion.label);
    setDestSuggestions([]);
  };

  const handleOriginSubmit = () => {
    const text = originText.trim();
    if (text)
      geocode(text, (result) => {
        setOrigin(result);
        setOriginText(result.label ?? text);
        setOriginSuggestions([]);
      });
  };

  const handleDestSubmit = () => {
    const text = destText.trim();
    if (text)
      geocode(text, (result) => {
        setDestination(result);
        setDestText(result.label ?? text);
        setDestSuggestions([]);
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
          onChangeText={handleOriginChange}
          onSubmitEditing={handleOriginSubmit}
          returnKeyType="done"
        />
      </View>
      {originSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {originSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => handleSelectOriginSuggestion(suggestion)}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {suggestion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.inputRow}>
        <View style={[styles.dot, styles.dotRed]} />
        <TextInput
          ref={destInputRef}
          style={styles.input}
          placeholder="Destination"
          placeholderTextColor={colors.textMuted}
          value={destText}
          onChangeText={handleDestChange}
          onSubmitEditing={handleDestSubmit}
          returnKeyType="done"
        />
      </View>
      {destSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {destSuggestions.map((suggestion) => (
            <TouchableOpacity
              key={suggestion.id}
              style={styles.suggestionItem}
              onPress={() => handleSelectDestSuggestion(suggestion)}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {suggestion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  suggestionsContainer: {
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 20,
    marginRight: 0,
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  suggestionText: {
    color: colors.text,
    fontSize: 13,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
  },
});
