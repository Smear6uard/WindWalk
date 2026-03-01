import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRoute } from '../context/RouteContext';

const DEMO_SCENARIOS = [
  {
    label: 'Blue Line → LaSalle & Monroe',
    origin: { lat: 41.8838, lng: -87.6322, label: 'Washington/Dearborn Blue Line' },
    dest: { lat: 41.8800, lng: -87.6326, label: 'LaSalle & Monroe' },
  },
  {
    label: 'Millennium Station → Willis Tower',
    origin: { lat: 41.8842, lng: -87.6247, label: 'Millennium Station' },
    dest: { lat: 41.8789, lng: -87.6359, label: 'Willis Tower' },
  },
  {
    label: 'Union Station → Art Institute',
    origin: { lat: 41.8787, lng: -87.6402, label: 'Union Station' },
    dest: { lat: 41.8796, lng: -87.6237, label: 'Art Institute' },
  },
];

export default function DemoButtons() {
  const { setOrigin, setDestination, fetchRoutesWithStops } = useRoute();

  const handlePress = (scenario) => {
    setOrigin(scenario.origin);
    setDestination(scenario.dest);
    setTimeout(() => {
      fetchRoutesWithStops(scenario.origin, scenario.dest);
    }, 100);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
    >
      {DEMO_SCENARIOS.map((scenario, index) => (
        <TouchableOpacity
          key={index}
          style={styles.chip}
          onPress={() => handlePress(scenario)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{scenario.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chip: {
    backgroundColor: '#0f3460',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: '#ffffff',
    fontSize: 13,
  },
});
