import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { RouteProvider } from './context/RouteContext';
import { colors } from './constants/colors';
import WeatherBar from './components/WeatherBar';
import SearchPanel from './components/SearchPanel';

function AppContent() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.slot}>
        <WeatherBar />
      </View>
      <View style={styles.slot}>
        <SearchPanel />
      </View>
      <View style={[styles.slot, styles.mapSlot]}>
        <Text style={styles.placeholder}>MapContainer</Text>
      </View>
      <View style={styles.slot}>
        <Text style={styles.placeholder}>RouteCards</Text>
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
});
