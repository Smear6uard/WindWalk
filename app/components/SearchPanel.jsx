import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { geocodeAddress } from '../utils/geocode';
import { useRoute } from '../context/RouteContext';

const DEBOUNCE_MS = 300;

export default function SearchPanel() {
  const { origin, destination, setOrigin, setDestination, fetchRoutes, loading } = useRoute();

  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  const originDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);
  const skipNextSearchRef = useRef(false);

  const handleSearch = async (value, field) => {
    setError(null);
    setActiveField(field);
    setSearching(true);
    try {
      const results = await geocodeAddress(value);
      setSuggestions(results);
    } catch (e) {
      setSuggestions([]);
      setError('Unable to find that address.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const q = originQuery.trim();
    if (originDebounceRef.current) clearTimeout(originDebounceRef.current);
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (!q) {
      setSuggestions([]);
      return;
    }
    originDebounceRef.current = setTimeout(() => handleSearch(q, 'origin'), DEBOUNCE_MS);
    return () => { if (originDebounceRef.current) clearTimeout(originDebounceRef.current); };
  }, [originQuery]);

  useEffect(() => {
    const q = destQuery.trim();
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    if (!q) {
      setSuggestions([]);
      return;
    }
    destDebounceRef.current = setTimeout(() => handleSearch(q, 'destination'), DEBOUNCE_MS);
    return () => { if (destDebounceRef.current) clearTimeout(destDebounceRef.current); };
  }, [destQuery]);

  const handleSelectSuggestion = (item) => {
    skipNextSearchRef.current = true;
    if (activeField === 'origin') {
      setOrigin(item.coordinates);
      setOriginQuery(item.label);
    } else if (activeField === 'destination') {
      setDestination(item.coordinates);
      setDestQuery(item.label);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const handleSwap = () => {
    const prevOrigin = originQuery;
    const prevDest = destQuery;
    setOriginQuery(prevDest);
    setDestQuery(prevOrigin);
    if (origin && destination) {
      setOrigin(destination);
      setDestination(origin);
    }
    setSuggestions([]);
    setActiveField(null);
  };

  const handleSubmitRoute = async () => {
    setError(null);
    try {
      await fetchRoutes();
    } catch (e) {
      setError('Unable to calculate route.');
    }
  };

  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestion}
      onPress={() => handleSelectSuggestion(item)}
    >
      <Text style={styles.suggestionText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan your WindWalk</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>From</Text>
        <TextInput
          style={styles.input}
          placeholder="Start address"
          placeholderTextColor={colors.textMuted}
          value={originQuery}
          onChangeText={setOriginQuery}
          onFocus={() => handleSearch(originQuery.trim(), 'origin')}
          onSubmitEditing={() => handleSearch(originQuery, 'origin')}
          returnKeyType="search"
        />
        {activeField === 'origin' && !!suggestions.length && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestion}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.swapRow}>
        <TouchableOpacity
          style={styles.swapButton}
          onPress={handleSwap}
          accessibilityLabel="Swap start and end locations"
        >
          <Ionicons name="swap-vertical" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>To</Text>
        <TextInput
          style={styles.input}
          placeholder="Destination address"
          placeholderTextColor={colors.textMuted}
          value={destQuery}
          onChangeText={setDestQuery}
          onFocus={() => handleSearch(destQuery.trim(), 'destination')}
          onSubmitEditing={() => handleSearch(destQuery, 'destination')}
          returnKeyType="search"
        />
        {activeField === 'destination' && !!suggestions.length && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestion}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {searching && (
        <View style={styles.inlineStatus}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.statusText}>Searching addresses…</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmitRoute}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Find pedway route</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  fieldGroup: {
    marginTop: 4,
  },
  swapRow: {
    alignItems: 'center',
    marginVertical: -4,
  },
  swapButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceLight,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  suggestionsContainer: {
    maxHeight: 160,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  suggestion: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a4a',
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
});

