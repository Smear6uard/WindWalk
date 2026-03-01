import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { RouteProvider, useRoute } from './context/RouteContext';
import { colors } from './constants/colors';
import WeatherBar from './components/WeatherBar';
import SearchPanel from './components/SearchPanel';
import DemoButtons from './components/DemoButtons';
import RouteCards from './components/RouteCards';

function AppContent() {
  const { loading } = useRoute();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slot}>
        <WeatherBar />
      </View>
      <View style={styles.slot}>
        <SearchPanel />
      </View>
      <View style={styles.slot}>
        <DemoButtons />
      </View>
      {/* P4: Slot your MapContainer component here */}
      <View style={[styles.slot, styles.mapSlot]}>
        <Text style={styles.placeholder}>MapContainer</Text>
      </View>
      <View style={styles.slot}>
        <View style={styles.routeCardsWrapper}>
          <RouteCards />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4ECDC4" />
              <Text style={styles.loadingText}>Finding your warmest route...</Text>
            </View>
          )}
        </View>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <RouteProvider>
      <AppContent />
    </RouteProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  slot: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  mapSlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 14,
  },
  routeCardsWrapper: {
    minHeight: 120,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
  },
});
