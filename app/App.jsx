import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RouteProvider } from './context/RouteContext';
import colors from './constants/colors';
import WeatherBar from './components/WeatherBar';
import SearchPanel from './components/SearchPanel';
import MapContainer from './components/MapContainer';
import RouteCards from './components/RouteCards';

export default function App() {
  return (
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
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  top: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  middle: {
    flex: 2,
  },
  bottom: {
    flex: 1,
  },
});
