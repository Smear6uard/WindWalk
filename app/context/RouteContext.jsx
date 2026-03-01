import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_URL } from '../constants/config';
import { buildOfflineWeather, fetchRoute, fetchWindStreets } from '../utils/api';

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [weather, setWeather] = useState(null);
  const [windStreets, setWindStreets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState('comfort');
  const [mapFullScreen, setMapFullScreen] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  const refreshWeather = useCallback(async ({ force = false } = {}) => {
    setWeatherLoading(true);
    try {
      const url = force
        ? `${API_URL}/api/weather?force_refresh=true`
        : `${API_URL}/api/weather`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Weather request failed with ${res.status}`);
      }
      const data = await res.json();
      setWeather(data);
      return data;
    } catch {
      const fallback = buildOfflineWeather(force ? Date.now() : 0);
      setWeather(fallback);
      return fallback;
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Fetch weather on mount so wind streets are available before route search.
  useEffect(() => {
    refreshWeather();
  }, [refreshWeather]);

  // When backend was unreachable (offline weather), retry periodically so we pick it up once it's running.
  useEffect(() => {
    if (weather?.source !== 'offline') return;
    const id = setInterval(() => refreshWeather(), 10_000);
    return () => clearInterval(id);
  }, [weather?.source, refreshWeather]);

  const refreshWindStreets = useCallback(async (windDirection) => {
    if (!windDirection) {
      setWindStreets(null);
      return;
    }
    try {
      const data = await fetchWindStreets(windDirection);
      setWindStreets(data);
    } catch {
      setWindStreets(null);
    }
  }, []);

  // Fetch windy street segments whenever current wind direction changes.
  useEffect(() => {
    const wd = weather?.wind_direction;
    if (!wd) return;
    refreshWindStreets(wd);
  }, [refreshWindStreets, weather?.wind_direction]);

  const fetchRoutes = useCallback(async ({ origin: originOverride, destination: destinationOverride } = {}) => {
    const routeOrigin = originOverride ?? origin;
    const routeDestination = destinationOverride ?? destination;

    if (!routeOrigin || !routeDestination) {
      setError('Select both origin and destination.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchRoute(routeOrigin, routeDestination);
      const nextRoutes = Array.isArray(data?.routes) ? data.routes : [];
      setRoutes(nextRoutes);
      if (data?.weather) {
        setWeather(data.weather);
      } else {
        await refreshWeather();
      }
      if (data?.fallback) {
        setError('Backend is unreachable. Showing offline demo routes.');
      }

      const hasComfort = nextRoutes.some((route) => route.id === 'comfort');
      const hasShortest = nextRoutes.some((route) => route.id === 'shortest');
      if (hasComfort) {
        setActiveRoute('comfort');
      } else if (hasShortest) {
        setActiveRoute('shortest');
      } else if (nextRoutes[0]?.id) {
        setActiveRoute(nextRoutes[0].id);
      }
    } catch (err) {
      console.warn('Route fetch error:', err);
      setRoutes(null);
      setError('Unable to calculate routes right now.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [destination, origin, refreshWeather]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = {
    origin,
    setOrigin,
    destination,
    setDestination,
    routes,
    setRoutes,
    weather,
    setWeather,
    windStreets,
    loading,
    setLoading,
    weatherLoading,
    activeRoute,
    setActiveRoute,
    mapFullScreen,
    setMapFullScreen,
    theme,
    setTheme,
    toggleTheme,
    error,
    setError,
    fetchRoutes,
    refreshWeather,
    refreshWindStreets,
  };

  return (
    <RouteContext.Provider value={value}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
}
