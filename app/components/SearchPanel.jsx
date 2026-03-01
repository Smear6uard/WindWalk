import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import colors from '../constants/colors';
import { geocodeAddress } from '../utils/geocode';
import { useRoute } from '../context/RouteContext';

export default function SearchPanel() {
  const { setOrigin, setDestination, fetchRoutes, loading } = useRoute();

  const [originQuery, setOriginQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSelectSuggestion = (item) => {
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
          onSubmitEditing={() => handleSearch(originQuery, 'origin')}
          returnKeyType="search"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>To</Text>
        <TextInput
          style={styles.input}
          placeholder="Destination address"
          placeholderTextColor={colors.textMuted}
          value={destQuery}
          onChangeText={setDestQuery}
          onSubmitEditing={() => handleSearch(destQuery, 'destination')}
          returnKeyType="search"
        />
      </View>

      {searching && (
        <View style={styles.inlineStatus}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.statusText}>Searching addresses…</Text>
        </View>
      )}

      {!!suggestions.length && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={renderSuggestion}
          />
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

