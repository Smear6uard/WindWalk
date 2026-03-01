import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import Markers from './Markers';
import PedwayOverlay from './PedwayOverlay';
import RouteLine from './RouteLine';
import WindOverlay from './WindOverlay';
import { LOOP_CENTER, MAP_COLORS, ZOOM_DEFAULTS } from '../constants/mapConfig';
import useWeather from '../hooks/useWeather';
import { useRoute } from '../context/RouteContext';

// Convert GeoJSON [lng, lat] to react-native-maps { latitude, longitude }
function geoJsonToMapCoord([lng, lat]) {
  return { latitude: lat, longitude: lng };
}

// Extract polyline coordinates from a route object's geometry
function extractPolyline(route) {
  const coords = route?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return [];
  return coords.map(geoJsonToMapCoord);
}

// Convert context origin/destination { lat, lng } to map coordinate
function contextToMapCoord(point) {
  if (!point || typeof point.lat !== 'number' || typeof point.lng !== 'number') return null;
  return { latitude: point.lat, longitude: point.lng };
}

const FIT_PADDING = { top: 80, right: 40, bottom: 260, left: 40 };

export default function MapContainer() {
  const mapRef = useRef(null);
  const weather = useWeather();
  const { routes, origin, destination, activeRoute } = useRoute();

  const originCoord = useMemo(() => contextToMapCoord(origin), [origin]);
  const destinationCoord = useMemo(() => contextToMapCoord(destination), [destination]);
  const comfortRoute = useMemo(() => extractPolyline(routes?.comfort), [routes?.comfort]);
  const shortestRoute = useMemo(() => extractPolyline(routes?.shortest), [routes?.shortest]);
  const pedwaySegments = useMemo(() => [], []);

  useEffect(() => {
    if (comfortRoute.length < 2 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(comfortRoute, {
      edgePadding: FIT_PADDING,
      animated: true,
    });
  }, [comfortRoute]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...LOOP_CENTER,
          ...ZOOM_DEFAULTS,
        }}
      >
        <RouteLine comfortRoute={comfortRoute} shortestRoute={shortestRoute} activeRoute={activeRoute} />
        <PedwayOverlay segments={pedwaySegments} />
        <Markers origin={originCoord} destination={destinationCoord} />
        <WindOverlay weather={weather} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAP_COLORS.background,
  },
  map: {
    flex: 1,
    backgroundColor: MAP_COLORS.background,
  },
});
