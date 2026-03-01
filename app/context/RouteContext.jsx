import { createContext, useContext, useState, useCallback } from 'react';
import { fetchRoute } from '../utils/api';

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState('comfort');
  const [error, setError] = useState(null);

  const fetchRoutes = useCallback(async () => {
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      setError('Origin and destination are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoute(origin, destination);
      setRoutes(data.routes ?? data);
      setWeather(data.weather ?? null);
    } catch (err) {
      setError(err.message || 'Failed to fetch routes');
      setRoutes(null);
      setWeather(null);
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
    loading,
    setLoading,
    activeRoute,
    setActiveRoute,
    error,
    setError,
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
  if (!ctx) {
    throw new Error('useRoute must be used within RouteProvider');
  }
  return ctx;
}
