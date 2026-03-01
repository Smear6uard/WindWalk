import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { API_URL } from '../constants/config';
import { fetchRoute, fetchWindStreets } from '../utils/api';

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [weather, setWeather] = useState(null);
  const [windStreets, setWindStreets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState('comfort');

  // Fetch weather on mount so we can show windy streets before user enters a route
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/weather`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setWeather(data);
        }
      } catch {
        // Ignore; weather will come from route fetch if user gets a route
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch windy street segments when we have wind direction
  useEffect(() => {
    const wd = weather?.wind_direction;
    if (!wd) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWindStreets(wd);
        if (!cancelled) setWindStreets(data);
      } catch {
        if (!cancelled) setWindStreets(null);
      }
    })();
    return () => { cancelled = true; };
  }, [weather?.wind_direction]);

  const fetchRoutes = useCallback(async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setRoutes(null);
    setWeather(null);
    try {
      const data = await fetchRoute(origin, destination);
      setRoutes(data.routes ?? data);
      setWeather(data.weather ?? null);
    } catch (err) {
      console.warn('Route fetch error:', err);
      setRoutes(null);
      setWeather(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

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
    activeRoute,
    setActiveRoute,
    fetchRoutes,
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
