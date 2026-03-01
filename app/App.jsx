import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RouteProvider } from './context/RouteContext';
import colors from './constants/colors';
import WeatherBar from './components/WeatherBar';
import SearchPanel from './components/SearchPanel';
import MapContainer from './components/MapContainer';
import RouteCards from './components/RouteCards';

export default function App() {
  return (
    <SafeAreaProvider>
      <RouteProvider>
        <SafeAreaView style={styles.shell}>
        <StatusBar style="light" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.top}>
            <WeatherBar />
            <SearchPanel />
          </View>
          <View style={styles.middle}>
            <MapContainer />
          </View>
          <View style={styles.bottom}>
            <RouteCards />
          </View>
        </ScrollView>
        </SafeAreaView>
      </RouteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  top: {
    flexGrow: 0,
  },
  middle: {
    minHeight: 280,
    marginTop: 8,
  },
  bottom: {
    flexGrow: 0,
    marginTop: 8,
  },
});
