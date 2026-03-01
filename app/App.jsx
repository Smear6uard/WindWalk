import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RouteProvider, useRoute } from './context/RouteContext';
import { DARK_COLORS, LIGHT_COLORS } from './constants/colors';
import WeatherBar from './components/WeatherBar';
import SearchPanel from './components/SearchPanel';
import MapContainer from './components/MapContainer';
import RouteCards from './components/RouteCards';

function AppContent() {
  const { mapFullScreen, setMapFullScreen, theme, toggleTheme } = useRoute();

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const body = mapFullScreen ? (
    <View style={styles.fullScreenWrap}>
      <View style={styles.fullScreenMapArea}>
        <MapContainer fullScreen />
        <TouchableOpacity
          style={styles.exitButton}
          onPress={() => setMapFullScreen(false)}
          accessibilityLabel="Exit full screen map"
        >
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.fullScreenBottom}>
        <RouteCards />
      </View>
    </View>
  ) : (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
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
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.appContainer}>
        <View style={styles.appHeader}>
          <Text style={styles.appHeaderTitle}>WindWalk</Text>
          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.themeToggle}
            accessibilityLabel="Toggle dark and light mode"
          >
            <Text style={styles.themeToggleText}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
          </TouchableOpacity>
        </View>
        {body}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <RouteProvider>
        <AppContent />
      </RouteProvider>
    </SafeAreaProvider>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    shell: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    appContainer: {
      flex: 1,
    },
    appHeader: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    appHeaderTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    themeToggle: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceLight,
    },
    themeToggleText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '500',
    },
    keyboard: {
      flex: 1,
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
      height: 360,
      marginTop: 8,
    },
    bottom: {
      flexGrow: 0,
      marginTop: 8,
      paddingBottom: 12,
    },
    fullScreenWrap: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    fullScreenMapArea: {
      flex: 1,
    },
    fullScreenBottom: {
      flexGrow: 0,
      marginTop: 8,
      paddingBottom: 12,
    },
    exitButton: {
      position: 'absolute',
      top: 12,
      right: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#2a2a4a',
    },
    exitButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}
