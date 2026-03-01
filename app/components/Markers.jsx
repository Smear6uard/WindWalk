import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { MAP_COLORS } from '../constants/mapConfig';

function OriginMarker({ coordinate }) {
  if (!coordinate) {
    return null;
  }

  return (
    <Marker coordinate={coordinate} title="Origin">
      <View style={[styles.marker, styles.originMarker]} />
    </Marker>
  );
}

function DestMarker({ coordinate }) {
  if (!coordinate) {
    return null;
  }

  return (
    <Marker coordinate={coordinate} title="Destination">
      <View style={[styles.marker, styles.destMarker]} />
    </Marker>
  );
}

export default function Markers({ origin, destination }) {
  return (
    <>
      <OriginMarker coordinate={origin} />
      <DestMarker coordinate={destination} />
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  originMarker: {
    backgroundColor: MAP_COLORS.origin,
  },
  destMarker: {
    backgroundColor: MAP_COLORS.destination,
  },
});
