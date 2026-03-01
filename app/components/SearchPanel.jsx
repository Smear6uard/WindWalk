import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/colors';
import { geocodeAddress } from '../utils/geocode';
import { useRoute } from '../context/RouteContext';

const DEBOUNCE_MS = 220;

function normalizeResult(item) {
  return {
    id: item.id,
    label: item.label,
    coordinates: {
      lat: Number(item.coordinates.lat),
      lng: Number(item.coordinates.lng),
    },
  };
}

function isPoint(point) {
  return (
    point &&
    typeof point === 'object' &&
    typeof point.lat === 'number' &&
    typeof point.lng === 'number'
  );
}

export default function SearchPanel() {
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    fetchRoutes,
    loading,
    error,
    setError,
  } = useRoute();

  const [originQuery, setOriginQuery] = useState(origin?.label ?? '');
  const [destQuery, setDestQuery] = useState(destination?.label ?? '');

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [searchingField, setSearchingField] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const originDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);

  const { theme } = useRoute();
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    setOriginQuery(origin?.label ?? originQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.label]);

  useEffect(() => {
    setDestQuery(destination?.label ?? destQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.label]);

  const runSearch = async (field, queryText) => {
    const trimmed = queryText.trim();

    if (!trimmed) {
      setSearchingField(field);
      try {
        const results = await geocodeAddress('');
        const normalized = results.slice(0, 5).map(normalizeResult);
        if (field === 'origin') {
          setOriginSuggestions(normalized);
        } else {
          setDestSuggestions(normalized);
        }
      } catch {
        if (field === 'origin') {
          setOriginSuggestions([]);
        } else {
          setDestSuggestions([]);
        }
      } finally {
        setSearchingField(null);
      }
      return;
    }

    setSearchingField(field);
    try {
      const results = await geocodeAddress(trimmed);
      const normalized = results.map(normalizeResult);
      if (field === 'origin') {
        setOriginSuggestions(normalized);
      } else {
        setDestSuggestions(normalized);
      }
    } catch {
      if (field === 'origin') {
        setOriginSuggestions([]);
      } else {
        setDestSuggestions([]);
      }
    } finally {
      setSearchingField(null);
    }
  };

  const scheduleSearch = (field, nextText) => {
    if (field === 'origin') {
      if (originDebounceRef.current) {
        clearTimeout(originDebounceRef.current);
      }
      originDebounceRef.current = setTimeout(() => {
        runSearch('origin', nextText);
      }, DEBOUNCE_MS);
    } else {
      if (destDebounceRef.current) {
        clearTimeout(destDebounceRef.current);
      }
      destDebounceRef.current = setTimeout(() => {
        runSearch('destination', nextText);
      }, DEBOUNCE_MS);
    }
  };

  const handleOriginChange = (text) => {
    setOriginQuery(text);
    setOrigin(null);
    setActiveField('origin');
    scheduleSearch('origin', text);
  };

  const handleDestChange = (text) => {
    setDestQuery(text);
    setDestination(null);
    setActiveField('destination');
    scheduleSearch('destination', text);
  };

  const handleSelectSuggestion = (field, item) => {
    const normalized = normalizeResult(item);
    if (field === 'origin') {
      setOrigin(normalized.coordinates);
      setOriginQuery(normalized.label);
      setOriginSuggestions([]);
    } else {
      setDestination(normalized.coordinates);
      setDestQuery(normalized.label);
      setDestSuggestions([]);
    }
    setActiveField(null);
    setError?.(null);
  };

  const resolveFieldIfNeeded = async (field) => {
    const existingPoint = field === 'origin' ? origin : destination;
    if (isPoint(existingPoint)) return existingPoint;

    const query = field === 'origin' ? originQuery.trim() : destQuery.trim();
    if (!query) return null;

    const results = await geocodeAddress(query);
    const first = results[0];
    if (!first) return null;

    const normalized = normalizeResult(first);
    handleSelectSuggestion(field, normalized);
    return normalized.coordinates;
  };

  const handleSwap = () => {
    const nextOriginQuery = destQuery;
    const nextDestQuery = originQuery;
    const nextOrigin = destination;
    const nextDest = origin;

    setOriginQuery(nextOriginQuery);
    setDestQuery(nextDestQuery);
    setOrigin(nextOrigin);
    setDestination(nextDest);

    setOriginSuggestions([]);
    setDestSuggestions([]);
    setActiveField(null);
    setError?.(null);
  };

  const handleSubmitRoute = async () => {
    setError?.(null);
    setSubmitting(true);

    try {
      const [resolvedOrigin, resolvedDestination] = await Promise.all([
        resolveFieldIfNeeded('origin'),
        resolveFieldIfNeeded('destination'),
      ]);

      if (!resolvedOrigin || !resolvedDestination) {
        setError?.('Pick valid addresses from suggestions.');
        return;
      }

      try {
        await fetchRoutes({
          origin: resolvedOrigin,
          destination: resolvedDestination,
        });
      } catch {
        setError?.('Unable to calculate route. Check backend connectivity.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const showOriginSuggestions = activeField === 'origin' && originSuggestions.length > 0;
  const showDestSuggestions = activeField === 'destination' && destSuggestions.length > 0;

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
          onFocus={() => {
            setActiveField('origin');
            runSearch('origin', originQuery);
          }}
          onChangeText={handleOriginChange}
          onSubmitEditing={() => {
            if (originSuggestions[0]) {
              handleSelectSuggestion('origin', originSuggestions[0]);
            }
          }}
          returnKeyType="search"
        />

        {showOriginSuggestions ? (
          <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
            {originSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestion}
                onPress={() => handleSelectSuggestion('origin', item)}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
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
          onFocus={() => {
            setActiveField('destination');
            runSearch('destination', destQuery);
          }}
          onChangeText={handleDestChange}
          onSubmitEditing={() => {
            if (destSuggestions[0]) {
              handleSelectSuggestion('destination', destSuggestions[0]);
            }
          }}
          returnKeyType="search"
        />

        {showDestSuggestions ? (
          <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
            {destSuggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestion}
                onPress={() => handleSelectSuggestion('destination', item)}
              >
                <Text style={styles.suggestionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {searchingField ? (
        <View style={styles.inlineStatus}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.statusText}>Searching {searchingField}...</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (loading || submitting) && styles.buttonDisabled]}
        onPress={handleSubmitRoute}
        disabled={loading || submitting}
      >
        {loading || submitting ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Find Warmest Route</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
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
      position: 'relative',
      zIndex: 5,
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
      maxHeight: 172,
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
}
