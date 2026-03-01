import React, { useMemo, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_COLORS } from '../constants/mapConfig';

// Fix default marker icons in react-leaflet (broken in webpack/vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  const map = useMap();
  useEffect(() => {
    if (!onMapClick) return;
    const handler = () => onMapClick();
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [map, onMapClick]);
  return null;
}

export default function WebMap({ routeCoords, coloredSegments, origin, destination, windStreets, onMapClick, fullScreen }) {
  const positions = useMemo(() => {
    return routeCoords.map((c) => [c.latitude, c.longitude]);
  }, [routeCoords]);

  const segmentPolylines = useMemo(() => {
    if (!coloredSegments?.length) return null;
    return coloredSegments.map((seg, idx) => {
      const pos = seg.coordinates.map(([lng, lat]) => [lat, lng]);
      const color =
        seg.type === 'pedway' ? MAP_COLORS.pedway : MAP_COLORS.comfortRoute;
      return { key: idx, positions: pos, color };
    });
  }, [coloredSegments]);

  const windyPolylines = useMemo(() => {
    const features = windStreets?.features ?? [];
    return features
      .map((f, i) => {
        const coords = f.geometry?.coordinates ?? [];
        if (coords.length < 2) return null;
        const pos = coords.map(([lng, lat]) => [lat, lng]);
        return { key: `windy-${i}`, positions: pos };
      })
      .filter(Boolean);
  }, [windStreets]);

  const center = useMemo(() => {
    if (positions.length > 0) {
      const lats = positions.map((p) => p[0]);
      const lngs = positions.map((p) => p[1]);
      return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
    }
    return [41.8819, -87.6278];
  }, [positions]);

  const bounds = useMemo(() => {
    if (positions.length < 2) return null;
    return L.latLngBounds(positions);
  }, [positions]);

  return (
    <div style={{ height: fullScreen ? '100%' : 200, width: '100%', borderRadius: fullScreen ? 0 : 12, overflow: 'hidden' }}>
      <LeafletMap
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <FitBounds bounds={bounds} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {windyPolylines.map(({ key, positions: pos }) => (
          <Polyline
            key={key}
            positions={pos}
            pathOptions={{ color: MAP_COLORS.windyStreet, weight: 2 }}
          />
        ))}
        {segmentPolylines
          ? segmentPolylines.map(({ key, positions: pos, color }) => (
              <Polyline
                key={key}
                positions={pos}
                pathOptions={{ color, weight: 5 }}
              />
            ))
          : positions.length > 1 && (
              <Polyline
                positions={positions}
                pathOptions={{ color: MAP_COLORS.comfortRoute, weight: 5 }}
              />
            )}
        {origin && (
          <Marker position={[origin.lat, origin.lng]}>
            <Popup>Origin</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>Destination</Popup>
          </Marker>
        )}
      </LeafletMap>
    </div>
  );
}
