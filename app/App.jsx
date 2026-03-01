import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  top: {
    flexGrow: 0,
  },
  middle: {
    flex: 1,
    minHeight: 300,
    marginTop: 8,
  },
  bottom: {
    flexGrow: 0,
    marginTop: 8,
    paddingBottom: 12,
  },
});
